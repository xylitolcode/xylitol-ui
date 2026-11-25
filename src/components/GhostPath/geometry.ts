import { GHOST_DEFAULTS } from './trace'
import type { GhostKind, GhostTrace } from './trace'

/** How much of the incoming sample wins over the running average. */
const SMOOTH = 0.3
/** Douglas–Peucker tolerance, in pixels. Below this nobody can see the corner. */
const EPSILON = 0.8

export interface GhostBox {
  left: number
  top: number
  width: number
  height: number
}

export interface GhostPoint {
  t: number
  x: number
  y: number
  kind: GhostKind
  /** Points in different segments have no line between them. */
  seg: number
}

export interface GhostStop {
  t: number
  s: number
}

export interface GhostGeometry {
  points: GhostPoint[]
  /** Arc length travelled before each point. Never adds across a segment break. */
  cum: number[]
  total: number
  duration: number
  stops: GhostStop[]
}

export const EMPTY_GEOMETRY: GhostGeometry = {
  points: [],
  cum: [],
  total: 0,
  duration: 0,
  stops: [],
}

interface RawPoint {
  t: number
  x: number
  y: number
  line: number
  kind: GhostKind
}

/** A surrogate pair is one character; measuring half of it yields half a box. */
function unitLength(data: string, at: number) {
  const code = data.charCodeAt(at)
  return code >= 0xd800 && code <= 0xdbff && at + 1 < data.length ? 2 : 1
}

/**
 * Boxes for the characters the trace actually visits, not for the whole
 * paragraph. A few hundred samples pass over maybe sixty characters, and sixty
 * Range queries are a few milliseconds while a thousand are a dropped frame.
 */
export function measureCharBoxes(node: Text, offsets: number[]): Map<number, GhostBox> {
  const boxes = new Map<number, GhostBox>()
  const data = node.data
  const range = document.createRange()

  for (const at of offsets) {
    if (at < 0 || at >= data.length) continue

    range.setStart(node, at)
    range.setEnd(node, at + unitLength(data, at))
    const rect = range.getClientRects()[0]
    if (!rect) continue

    boxes.set(at, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })
  }

  return boxes
}

function nearestKey(keys: number[], at: number): number | null {
  if (!keys.length) return null
  let low = 0
  let high = keys.length - 1

  while (low < high) {
    const mid = (low + high) >> 1
    if (keys[mid] < at) low = mid + 1
    else high = mid
  }

  const after = keys[low]
  const before = keys[low - 1] ?? after
  return Math.abs(after - at) <= Math.abs(at - before) ? after : before
}

/**
 * Turn a trace plus a set of character boxes into one array of pixels, a path,
 * and an arc-length table. Everything here runs at measure time only — the
 * playback loop reads from the result and never touches layout.
 */
export function buildGeometry(
  trace: GhostTrace,
  boxes: Map<number, GhostBox>,
  origin: { left: number; top: number },
): GhostGeometry {
  const keys = [...boxes.keys()].sort((a, b) => a - b)
  if (!keys.length) return EMPTY_GEOMETRY

  const lineOf = new Map<number, number>()
  const raw: RawPoint[] = []

  for (const [t, at, bias, dy, kind] of trace.samples) {
    const key = boxes.has(at) ? at : nearestKey(keys, at)
    if (key === null) continue
    const box = boxes.get(key)
    if (!box) continue

    const lineKey = Math.round(box.top * 2)
    if (!lineOf.has(lineKey)) lineOf.set(lineKey, lineOf.size)

    raw.push({
      t,
      x: box.left + clamp01(bias) * box.width - origin.left,
      y: box.top + dy * box.height - origin.top,
      line: lineOf.get(lineKey) ?? 0,
      kind,
    })
  }

  if (!raw.length) return EMPTY_GEOMETRY

  smooth(raw)
  const segments = split(raw)
  const points: GhostPoint[] = []

  segments.forEach((segment, seg) => {
    for (const point of simplify(segment)) {
      points.push({ t: point.t, x: point.x, y: point.y, kind: point.kind, seg })
    }
  })

  const cum: number[] = []

  points.forEach((point, index) => {
    if (index === 0) {
      cum.push(0)
      return
    }
    const previous = points[index - 1]
    const joined = previous.seg === point.seg
    cum.push(cum[index - 1] + (joined ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0))
  })

  const stops: GhostStop[] = []
  points.forEach((point, index) => {
    if (point.kind !== 'pause') return
    const before = points[index - 1]
    const continues =
      before && before.kind === 'pause' && before.x === point.x && before.y === point.y
    if (!continues) stops.push({ t: point.t, s: cum[index] })
  })

  const last = points[points.length - 1]

  return {
    points,
    cum,
    total: cum[cum.length - 1],
    duration: last.t,
    stops,
  }
}

/** Kill the 3–4px tremor of a real pointer without rounding corners off. */
function smooth(points: RawPoint[]) {
  for (let index = 1; index < points.length; index++) {
    const point = points[index]
    const previous = points[index - 1]
    if (point.kind !== 'move' || previous.kind !== 'move' || previous.line !== point.line) continue

    // `previous` already holds the smoothed value, so this compounds instead of
    // collapsing the whole run toward its first sample.
    point.x = previous.x + (point.x - previous.x) * SMOOTH
    point.y = previous.y + (point.y - previous.y) * SMOOTH
  }
}

/**
 * A new segment whenever the text reflows to another line, or the pointer
 * vanished and came back somewhere else. A long pause is not a break: the pen
 * stayed down, and cutting the trail there would leave a gap in the middle of a
 * hold — exactly where the eye is looking.
 */
function split(points: RawPoint[]): RawPoint[][] {
  const segments: RawPoint[][] = []
  let current: RawPoint[] = []

  points.forEach((point, index) => {
    const previous = points[index - 1]
    if (previous) {
      const gap = point.t - previous.t
      const moved = Math.hypot(point.x - previous.x, point.y - previous.y)
      if (previous.line !== point.line || (gap > GHOST_DEFAULTS.gapMs && moved > 24)) {
        segments.push(current)
        current = []
      }
    }
    current.push(point)
  })

  if (current.length) segments.push(current)
  return segments
}

/**
 * Douglas–Peucker, but a pause, click or drag point is never a candidate for
 * removal: the hold is the whole message, and the algorithm's whole job is to
 * delete the middle of a straight run.
 */
function simplify(points: RawPoint[]): RawPoint[] {
  if (points.length <= 2) return points

  const keep = new Set<number>([0, points.length - 1])
  for (let index = 1; index < points.length - 1; index++) {
    if (points[index].kind !== 'move') keep.add(index)
  }

  const anchors = [...keep].sort((a, b) => a - b)
  for (let index = 0; index < anchors.length - 1; index++) {
    walk(points, anchors[index], anchors[index + 1], keep)
  }

  return points.filter((_, index) => keep.has(index))
}

function walk(points: RawPoint[], first: number, last: number, keep: Set<number>) {
  if (last - first < 2) return

  const a = points[first]
  const b = points[last]
  let worst = -1
  let worstDistance = 0

  for (let index = first + 1; index < last; index++) {
    const distance = perpendicular(points[index], a, b)
    if (distance > worstDistance) {
      worstDistance = distance
      worst = index
    }
  }

  if (worstDistance <= EPSILON || worst < 0) return

  keep.add(worst)
  walk(points, first, worst, keep)
  walk(points, worst, last, keep)
}

function perpendicular(point: RawPoint, a: RawPoint, b: RawPoint) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(point.x - a.x, point.y - a.y)

  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / length
}

/** Midpoint quads: smooth without inventing control points the recording never saw. */
function segmentPath(points: Array<{ x: number; y: number }>): string {
  const first = points[0]
  if (!first) return ''
  if (points.length === 1) return `M${round(first.x)} ${round(first.y)}`
  if (points.length === 2) {
    const second = points[1]
    return `M${round(first.x)} ${round(first.y)}L${round(second.x)} ${round(second.y)}`
  }

  let path = `M${round(first.x)} ${round(first.y)}`

  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index]
    const next = points[index + 1]
    const midX = (point.x + next.x) / 2
    const midY = (point.y + next.y) / 2
    path += `Q${round(point.x)} ${round(point.y)} ${round(midX)} ${round(midY)}`
  }

  const last = points[points.length - 1]
  path += `L${round(last.x)} ${round(last.y)}`
  return path
}

/**
 * The visible slice of the path, from arc length `from` to `to`.
 *
 * `stroke-dasharray` would be cheaper, but browsers restart the dash pattern at
 * every subpath, so a trail that has to break at line wraps cannot be cut with
 * dashes — each segment would be sliced against its own length instead of the
 * whole path. Slicing the geometry is the honest version.
 */
export function pathSlice(geometry: GhostGeometry, from: number, to: number): string {
  const { points, cum } = geometry
  if (points.length < 2 || to <= from) return ''

  const start = Math.max(0, Math.min(from, geometry.total))
  const end = Math.max(start, Math.min(to, geometry.total))
  if (end <= start) return ''

  const runs: string[] = []
  let run: Array<{ x: number; y: number }> = []
  let seg = -1

  const flush = () => {
    if (run.length) runs.push(segmentPath(run))
    run = []
  }

  const push = (x: number, y: number, nextSeg: number) => {
    if (nextSeg !== seg) {
      flush()
      seg = nextSeg
    }
    run.push({ x, y })
  }

  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const length = cum[index]
    const previous = points[index - 1]

    if (previous && length > start && cum[index - 1] < start) {
      const span = length - cum[index - 1]
      const k = span > 0 ? (start - cum[index - 1]) / span : 0
      push(
        previous.x + (point.x - previous.x) * k,
        previous.y + (point.y - previous.y) * k,
        point.seg,
      )
    }

    if (length >= start) {
      if (length >= end) {
        const span = previous ? length - cum[index - 1] : 0
        const k = span > 0 ? (end - (cum[index - 1] ?? 0)) / span : 0
        if (previous) {
          push(
            previous.x + (point.x - previous.x) * k,
            previous.y + (point.y - previous.y) * k,
            point.seg,
          )
        } else {
          push(point.x, point.y, point.seg)
        }
        break
      }
      push(point.x, point.y, point.seg)
    }
  }

  flush()
  return runs.join(' ')
}

export interface GhostSeek {
  x: number
  y: number
  /** Arc length travelled at this instant. Stays still through a hold. */
  s: number
  /** Pixels per millisecond, for the pen width. */
  speed: number
}

/**
 * Time first, then arc length inside that slice. Doing it the other way round —
 * normalising `t` against the total duration and multiplying by the path length
 * — replays the recording at a constant speed and erases every pause in it.
 */
export function seek(geometry: GhostGeometry, time: number): GhostSeek {
  const { points, cum } = geometry
  if (!points.length) return { x: 0, y: 0, s: 0, speed: 0 }

  const head = points[0]
  if (time <= head.t) return { x: head.x, y: head.y, s: 0, speed: 0 }

  let low = 0
  let high = points.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (points[mid].t <= time) low = mid
    else high = mid - 1
  }

  const a = points[low]
  const b = points[low + 1]
  if (!b) return { x: a.x, y: a.y, s: cum[low], speed: 0 }

  if (a.seg !== b.seg) return { x: b.x, y: b.y, s: cum[low + 1], speed: 0 }

  const span = b.t - a.t
  const k = span > 0 ? clamp01((time - a.t) / span) : 1
  const length = cum[low + 1] - cum[low]

  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    s: cum[low] + length * k,
    speed: span > 0 ? length / span : 0,
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

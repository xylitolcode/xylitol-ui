import { diffRuns } from '../../lib/diff'

export type GhostKind = 'move' | 'pause' | 'click' | 'drag'

/**
 * One recorded pointer sample. The position is not stored as a pixel: `at` is a
 * UTF-16 offset into the text, `bias` is the fraction across that character's
 * box, `dy` is the fraction down its line. Reflow the paragraph and the sample
 * still lands on the same character.
 */
export type GhostSample = [
  t: number,
  at: number,
  bias: number,
  dy: number,
  kind: GhostKind,
]

export interface GhostTrace {
  v?: 1
  /** Viewport the trace was recorded in. Diagnostic only; playback never reads it. */
  size?: string
  /** Text as it read when recorded. Used to remap offsets, not to validate. */
  text: string
  /** One line per pause, in order. Rendered by the caller, never by this component. */
  steps: string[]
  samples: GhostSample[]
}

export const GHOST_DEFAULTS = {
  speed: 1,
  weight: 3.6,
  capMs: 12_000,
  /** A silence longer than this breaks the trail instead of drawing across it. */
  gapMs: 420,
} as const

export function traceDuration(trace: GhostTrace): number {
  const last = trace.samples[trace.samples.length - 1]
  return last ? last[0] : 0
}

/**
 * A trace is either usable or it is not; there is no partial mode. Returns a
 * human-readable reason when it is not, so a build step can fail loudly instead
 * of shipping a path that points at nothing.
 */
export function traceProblem(trace: GhostTrace): string | null {
  if (!trace || typeof trace.text !== 'string') return 'text 缺失'
  if (!Array.isArray(trace.samples)) return 'samples 必须是数组'

  const length = trace.text.length
  let previous = -1

  for (const sample of trace.samples) {
    if (sample.length < 5) return '每个采样必须是 [t, at, bias, dy, kind]'
    const [t, at, bias, dy, kind] = sample
    if (!Number.isFinite(t) || t < 0) return `t 非法: ${t}`
    if (t < previous) return `t 必须单调递增: ${previous} → ${t}`
    if (!Number.isInteger(at) || at < 0 || at > length) {
      return `at 越界: ${at}（text 长度 ${length}）`
    }
    if (bias < 0 || bias > 1) return `bias 越界: ${bias}`
    if (dy < 0 || dy > 1.4) return `dy 越界: ${dy}`
    if (kind !== 'move' && kind !== 'pause' && kind !== 'click' && kind !== 'drag') {
      return `未知 kind: ${kind}`
    }
    previous = t
  }

  const stops = countStops(trace.samples)
  if (stops !== trace.steps.length) {
    return `pause 有 ${stops} 个，steps 有 ${trace.steps.length} 条`
  }

  return null
}

/** A pause holds at one place; the sample pair that opens and closes it is one stop. */
function countStops(samples: GhostSample[]): number {
  let stops = 0
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    if (sample[4] !== 'pause') continue
    const before = samples[i - 1]
    const same =
      before && before[4] === 'pause' && before[1] === sample[1] &&
      before[2] === sample[2] && before[3] === sample[3]
    if (!same) stops++
  }
  return stops
}

/**
 * Re-aim a trace at text that has since changed. Kept characters map one to
 * one; deleted ones collapse onto the seam they were cut from. This is the
 * reason offsets are UTF-16 in the first place — `DiffRun` speaks the same
 * units, so there is no translation layer to get wrong.
 */
export function remapTrace(trace: GhostTrace, text: string): GhostTrace {
  if (trace.text === text) return trace

  const map = new Map<number, number>()
  let seam = 0

  for (const run of diffRuns(trace.text, text)) {
    if (run.kind === 'keep') {
      for (let i = 0; i < run.text.length; i++) map.set(run.prevAt + i, run.at + i)
    } else if (run.kind === 'gone') {
      for (let i = 0; i < run.text.length; i++) map.set(run.prevAt + i, run.at)
      seam = run.at
    }
  }

  const limit = text.length
  const fallback = Math.min(seam, limit)
  const samples = trace.samples.map(([t, at, bias, dy, kind]): GhostSample => {
    const mapped = map.get(at)
    return [t, Math.min(mapped ?? fallback, limit), bias, dy, kind]
  })

  return { ...trace, text, samples }
}

/** Parse a trace that came from JSON, keeping the type honest about what it promises. */
export function readTrace(value: unknown): GhostTrace | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<GhostTrace>
  if (typeof raw.text !== 'string' || !Array.isArray(raw.samples)) return null

  const samples = raw.samples
    .filter((sample): sample is GhostSample => Array.isArray(sample) && sample.length >= 5)
    .map((sample) => [sample[0], sample[1], sample[2], sample[3], sample[4]] as GhostSample)

  return {
    v: 1,
    size: typeof raw.size === 'string' ? raw.size : undefined,
    text: raw.text,
    steps: Array.isArray(raw.steps) ? raw.steps.filter((step) => typeof step === 'string') : [],
    samples,
  }
}

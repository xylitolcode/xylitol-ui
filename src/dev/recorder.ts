import type { GhostKind, GhostSample, GhostTrace } from '../components/GhostPath/trace'

interface Recorded {
  t: number
  at: number
  bias: number
  dy: number
  kind: GhostKind
}

/** The overlay is a span too; recording only cares about the text node. */
function firstTextNode(root: Element): Text | null {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').length > 0) {
      return node as Text
    }
  }
  return null
}

function caretAt(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }

  if (typeof doc.caretRangeFromPoint === 'function') {
    return doc.caretRangeFromPoint(x, y)
  }

  const position = doc.caretPositionFromPoint?.(x, y)
  if (!position) return null

  const range = document.createRange()
  range.setStart(position.offsetNode, position.offset)
  range.collapse(true)
  return range
}

function boxAt(node: Text, at: number) {
  const data = node.data
  if (at < 0 || at >= data.length) return null

  const code = data.charCodeAt(at)
  const end = Math.min(data.length, at + (code >= 0xd800 && code <= 0xdbff ? 2 : 1))
  const range = document.createRange()
  range.setStart(node, at)
  range.setEnd(node, end)

  return range.getClientRects()[0] ?? null
}

export interface Recorder {
  sample: (event: PointerEvent, kind?: GhostKind) => void
  /** Hold the pen where it is for `hold` ms. This is what makes a step a step. */
  mark: (hold?: number) => void
  finish: (steps?: string[]) => GhostTrace
  count: () => number
}

/**
 * Turns live pointer events into a trace expressed in character offsets. This
 * lives outside the package entry on purpose: recording is a build-time chore,
 * and a recorder that ships in the runtime bundle is a container component
 * waiting to happen.
 */
export function createRecorder(node: Text): Recorder {
  const data = node.data
  const samples: Recorded[] = []
  const started = performance.now()
  let last = { at: 0, bias: 0.5, dy: 0.5 }
  let markCount = 0

  const now = () => performance.now() - started

  const push = (entry: Recorded) => {
    const previous = samples[samples.length - 1]
    if (previous && entry.t - previous.t < 8 && entry.at === previous.at) return
    samples.push(entry)
  }

  return {
    sample(event, kind = 'move') {
      const range = caretAt(event.clientX, event.clientY)

      let at = last.at
      if (range && range.startContainer === node) at = range.startOffset
      at = Math.min(at, Math.max(0, data.length - 1))

      const box = boxAt(node, at)
      const bias = box && box.width > 0 ? (event.clientX - box.left) / box.width : last.bias
      const dy = box && box.height > 0 ? (event.clientY - box.top) / box.height : 0.5

      last = { at, bias: clamp(bias, 0, 1), dy: clamp(dy, 0, 1) }
      push({ t: now(), ...last, kind })
    },

    mark(hold = 620) {
      const t = now()
      push({ t, ...last, kind: 'pause' })
      push({ t: t + hold, ...last, kind: 'pause' })
      markCount++
    },

    finish(steps = []) {
      if (samples.length && samples[samples.length - 1].kind === 'pause') {
        push({ t: now() + 260, ...last, kind: 'move' })
      }

      const trace: GhostTrace = {
        v: 1,
        size: `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`,
        text: data,
        steps,
        samples: samples.map((sample) => [
          Math.round(sample.t),
          sample.at,
          round(sample.bias),
          round(sample.dy),
          sample.kind,
        ]) as GhostSample[],
      }

      return trace
    },

    count: () => markCount,
  }
}

export function findRecorderNode(root: Element): Text | null {
  return firstTextNode(root)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

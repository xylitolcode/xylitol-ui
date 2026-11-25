import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from 'react'

import { diffRuns, type DiffRun } from '../../lib/diff'
import { useReducedMotion } from '../../lib/useReducedMotion'

import './MendText.css'

export type MendPhase = 'settled' | 'rewriting' | 'erasing'

type MendTextVariables = CSSProperties & {
  [key: `--mend-${string}`]: string | number | undefined
}

export interface MendTextProps {
  /** Current text. Change it and the rewrite plays; no diff has to be supplied. */
  children: string
  /** How long a leaving word holds before it collapses, in milliseconds. */
  hold?: number
  /** How long the collapse runs, in milliseconds. */
  collapse?: number
  /** Quiet stretch after the collapse before the rewrite counts as settled. */
  settle?: number
  /** How long arriving characters take to reach full ink, in milliseconds. */
  fresh?: number
  /** How long the arrival rule takes to grow, in milliseconds. */
  rule?: number
  /** Ink an arriving character starts at, 0 to 1. */
  freshInk?: number
  /** Ink a leaving character ends at, 0 to 1. */
  ink?: number
  /** Colour of both rules. Defaults to a grey derived from the inherited ink. */
  strike?: string
  /** Thickness of both rules, in pixels. */
  strikeWidth?: number
  /** Element used for the text. Defaults to `span`. */
  as?: ElementType
  /** Called when the rewrite enters a new phase. */
  onPhase?: (phase: MendPhase) => void
  className?: string
  style?: CSSProperties
}

export const MEND_DEFAULTS = {
  hold: 120,
  collapse: 400,
  settle: 320,
  fresh: 180,
  rule: 240,
  freshInk: 0.28,
  ink: 0.4,
  strikeWidth: 1,
} as const

function settledRuns(text: string): DiffRun[] {
  return text.length > 0 ? [{ kind: 'keep', text, at: 0, prevAt: 0 }] : []
}

function clearTimers(ids: number[]) {
  for (const id of ids) window.clearTimeout(id)
  ids.length = 0
}

/**
 * Text that reports its own edits. Give it a new string and the words that left
 * squeeze out of the line while the ones that arrived squeeze in at the same
 * seam. A swap crosses over inside one width instead of showing both sentences
 * side by side, so the paragraph never grows into a redline.
 *
 * The collapse is a width animation, not a FLIP pass: the reflow rides along
 * with it, so nothing has to be measured twice and no kept word has to become a
 * box. The measured width is handed to CSS as `--mend-w` so the keyframes own
 * the whole motion and the timers only have to report phases.
 */
export function MendText({
  children,
  hold = MEND_DEFAULTS.hold,
  collapse = MEND_DEFAULTS.collapse,
  settle = MEND_DEFAULTS.settle,
  fresh = MEND_DEFAULTS.fresh,
  rule = MEND_DEFAULTS.rule,
  freshInk = MEND_DEFAULTS.freshInk,
  ink = MEND_DEFAULTS.ink,
  strike,
  strikeWidth = MEND_DEFAULTS.strikeWidth,
  as = 'span',
  onPhase,
  className,
  style,
}: MendTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef(children)
  const transitionRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const onPhaseRef = useRef(onPhase)

  const [runs, setRuns] = useState<DiffRun[]>(() => settledRuns(children))

  const reducedMotion = useReducedMotion()

  onPhaseRef.current = onPhase

  useLayoutEffect(() => {
    const from = textRef.current
    if (from === children) return

    textRef.current = children
    transitionRef.current = true
    setRuns(diffRuns(from, children))
  }, [children])

  const report = (phase: MendPhase) => {
    const root = rootRef.current
    if (root) root.dataset.phase = phase
    onPhaseRef.current?.(phase)
  }

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    clearTimers(timersRef.current)

    if (!transitionRef.current) {
      report('settled')
      return
    }
    transitionRef.current = false

    const hunks = Array.from(root.querySelectorAll<HTMLElement>('.mend-hunk'))
    const leaving = hunks.filter((hunk) => hunk.dataset.kind === 'gone')
    const arriving = hunks.filter(
      (hunk) => hunk.dataset.kind === 'new' && hunk.dataset.swap === 'true',
    )

    if (reducedMotion) {
      for (const hunk of leaving) hunk.style.display = 'none'
      report('settled')
      return
    }

    const stylesOfRoot = getComputedStyle(root)
    const lineHeight =
      parseFloat(stylesOfRoot.lineHeight) || parseFloat(stylesOfRoot.fontSize) * 1.4

    // Read everything first, write afterwards. These widths are the only
    // measurement the component takes, and they are taken before the first
    // paint of the new text, so the doubled line is never shown.
    const leavingRects = leaving.map((hunk) => hunk.getBoundingClientRect())
    const arrivingRects = arriving.map((hunk) => hunk.getBoundingClientRect())

    let hideAt = 0

    leaving.forEach((hunk, index) => {
      const rect = leavingRects[index]

      // A run that wrapped cannot collapse sideways without re-wrapping into a
      // column of one character per line, so it leaves at once instead.
      if (rect.height > lineHeight * 1.6) {
        hunk.style.display = 'none'
        return
      }

      hunk.style.setProperty('--mend-w', `${rect.width}px`)
      hunk.dataset.fit = 'single'
      hideAt = Math.max(hideAt, Number(hunk.dataset.hold ?? hold) + collapse)
    })

    arriving.forEach((hunk, index) => {
      const rect = arrivingRects[index]
      if (rect.height > lineHeight * 1.6) return

      hunk.style.setProperty('--mend-w', `${rect.width}px`)
      hunk.dataset.fit = 'single'
    })

    report('rewriting')

    const settleAt = hideAt > 0 ? hideAt + settle : Math.max(fresh, rule) + 60

    if (hideAt > 0) {
      timersRef.current.push(
        window.setTimeout(() => {
          for (const hunk of leaving) hunk.style.display = 'none'
          report('erasing')
        }, hideAt),
      )
    }

    timersRef.current.push(
      window.setTimeout(() => report('settled'), Math.max(settleAt, hideAt)),
    )
  }, [runs, collapse, fresh, rule, settle, hold, reducedMotion])

  useEffect(() => {
    const timers = timersRef.current
    return () => clearTimers(timers)
  }, [])

  const variables: MendTextVariables = {
    '--mend-hold': `${hold}ms`,
    '--mend-collapse': `${collapse}ms`,
    '--mend-fresh': `${fresh}ms`,
    '--mend-rule': `${rule}ms`,
    '--mend-fresh-ink': freshInk,
    '--mend-ink': ink,
    '--mend-strike-width': `${strikeWidth}px`,
    ...(strike ? { '--mend-strike': strike } : null),
    ...style,
  }

  const Comp = as as 'span'

  return (
    <Comp
      ref={rootRef}
      className={`mend-text${className ? ` ${className}` : ''}`}
      style={variables}
    >
      {runs.map((run, index) => {
        if (run.kind === 'keep') {
          return (
            <span key={index} className="mend-text__run">
              {run.text}
            </span>
          )
        }

        // A removal followed straight by an insertion is a swap: the arriving
        // words grow into the space the leaving words are vacating.
        const swapped = run.kind === 'gone' && runs[index + 1]?.kind === 'new'
        const paired = run.kind === 'new' && runs[index - 1]?.kind === 'gone'

        return (
          <span
            key={index}
            className="mend-hunk"
            data-kind={run.kind}
            data-swap={paired ? 'true' : undefined}
            data-hold={swapped ? 0 : hold}
            aria-hidden={run.kind === 'gone' ? 'true' : undefined}
            style={swapped ? ({ '--mend-hold': '0ms' } as CSSProperties) : undefined}
          >
            <span className="mend-hunk__ink">{run.text}</span>
            <span className="mend-hunk__rule" aria-hidden="true" />
          </span>
        )
      })}
    </Comp>
  )
}

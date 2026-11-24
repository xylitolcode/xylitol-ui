import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
} from 'react'

import { useReducedMotion } from '../../lib/useReducedMotion'

import './ScanText.css'

export type ScanState = 'idle' | 'pending' | 'streaming' | 'done' | 'error'

type ScanTextVariables = CSSProperties & {
  [key: `--scan-${string}`]: string | number | undefined
}

export interface ScanTextProps {
  /** Text the read head travels across. */
  children: string
  /** Lifecycle of the scan. `idle` paints nothing and runs no frames. */
  state?: ScanState
  /**
   * Position of the read head, from 0 to 1. Supply it together with
   * `state="streaming"` for a determinate scan; leave it out for a loop.
   */
  progress?: number
  /** Seconds per pass in the indeterminate loop. */
  duration?: number
  /** Accent the head and the trail are mixed from. */
  color?: string
  /** Length of the cooling trail behind the head, in `em`. */
  tail?: number
  /** Strength of the not-yet-read text, 0 to 1. */
  restOpacity?: number
  /** Tilt of the beam in degrees. */
  angle?: number
  /** Shows the hairline needle that rides the head. Hidden on wrapped text. */
  caret?: boolean
  /** Shows a mono readout chip next to the text: percent, or the state name. */
  readout?: boolean
  /** Element used for the text. Defaults to `span`. */
  as?: ElementType
  className?: string
  style?: CSSProperties
}

export const SCAN_DEFAULTS = {
  state: 'idle',
  duration: 2.8,
  color: '#3074FE',
  tail: 6,
  restOpacity: 0.3,
  angle: 10,
} as const

const SEEK = 11

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Where the head parks when the scan is not allowed to move. */
function stillFrame(state: ScanState, aim: number | null): [number, number] {
  if (state === 'pending') return [0.55, 1]
  if (state === 'done') return [1, 0]
  if (state === 'error') return [aim ?? 0.42, 0.55]
  return [aim ?? 0.55, 1]
}

/**
 * A read head travels the text: the glyphs behind it keep the full ink, the
 * glyphs ahead stay dim, and the head itself is a hot edge that cools back to
 * ink along a trail whose length follows its speed. Position comes from
 * `progress`, not from a clock, so the text doubles as a progress bar.
 */
export function ScanText({
  children,
  state = SCAN_DEFAULTS.state,
  progress,
  duration = SCAN_DEFAULTS.duration,
  color = SCAN_DEFAULTS.color,
  tail = SCAN_DEFAULTS.tail,
  restOpacity = SCAN_DEFAULTS.restOpacity,
  angle = SCAN_DEFAULTS.angle,
  caret = true,
  readout = false,
  as = 'span',
  className,
  style,
}: ScanTextProps) {
  const elRef = useRef<HTMLSpanElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const widthRef = useRef(0)
  const posRef = useRef(0)
  const prevRef = useRef(0)
  const targetRef = useRef<number | null>(null)
  const paintRef = useRef<((position: number, tailScale: number) => void) | null>(null)
  const reducedMotion = useReducedMotion()

  const goal =
    typeof progress === 'number' && Number.isFinite(progress) ? clamp(progress, 0, 1) : null

  // Read by the running loop, so a new progress value never restarts a frame.
  targetRef.current = goal

  const live = state !== 'idle'

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const chip = readoutRef.current
      // The readout sits at the end of the line, so it must not stretch the
      // axis the head travels across.
      const chipWidth = chip
        ? chip.getBoundingClientRect().width + parseFloat(getComputedStyle(chip).marginLeft || '0')
        : 0
      widthRef.current = Math.max(0, rect.width - chipWidth)

      const styles = getComputedStyle(el)
      const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.4
      el.toggleAttribute('data-multiline', rect.height > lineHeight * 1.6)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)

    const paint = (position: number, tailScale: number) => {
      el.style.setProperty('--scan-p', `${(position * widthRef.current).toFixed(2)}px`)
      el.style.setProperty('--scan-tail-scale', tailScale.toFixed(3))
      el.style.setProperty(
        '--scan-caret-o',
        position > 0.012 && position < 0.995 ? '1' : '0',
      )

      const chip = readoutRef.current
      if (!chip) return

      const current = targetRef.current
      chip.textContent =
        state === 'error'
          ? 'error'
          : state === 'done'
            ? 'done'
            : current === null
              ? 'scan'
              : `${Math.round(clamp(position, 0, 1) * 100)}%`
    }

    paintRef.current = paint

    if (!live) {
      posRef.current = 0
      prevRef.current = 0
      el.style.removeProperty('--scan-p')
      el.style.removeProperty('--scan-tail-scale')
      el.style.removeProperty('--scan-caret-o')
      if (readoutRef.current) readoutRef.current.textContent = 'idle'
      return () => observer.disconnect()
    }

    // Still frames: reduced motion, a failure that has stopped dead, and a
    // finished scan that should simply read as plain text.
    if (reducedMotion || state === 'error') {
      const frame = stillFrame(state, targetRef.current)
      paint(frame[0], frame[1])
      return () => observer.disconnect()
    }

    let frame = 0
    let last = 0

    const tick = (now: number) => {
      const delta = last === 0 ? 0.016 : Math.min(0.05, (now - last) / 1000) || 0.016
      last = now

      const aim = targetRef.current
      let position = posRef.current
      let tailScale = 1
      let settled = false

      if (state === 'streaming' && aim !== null) {
        position += (aim - position) * (1 - Math.exp(-delta * SEEK))
        const speed = Math.abs(position - prevRef.current) / delta
        tailScale = clamp(1 + speed * 0.35, 1, 2.4)
      } else if (state === 'done') {
        position += (1.18 - position) * (1 - Math.exp(-delta * 12))
        tailScale = clamp(1 - (position - 0.7) / 0.35, 0, 1)

        if (position > 1.15) {
          position = 1.15
          tailScale = 0
          settled = true
        }
      } else {
        position += delta / Math.max(duration, 0.2)

        if (position > 1.14) position = -0.06
        tailScale = clamp(1 + (0.5 / Math.max(duration, 0.2)), 1, 1.6)
      }

      prevRef.current = position
      posRef.current = position
      paint(position, tailScale)

      if (settled) return
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [duration, live, readout, reducedMotion, state])

  // A frozen head still has to follow `progress`, otherwise reduced motion and
  // a dead scan would be stuck at whatever value they first rendered with.
  useEffect(() => {
    if (!live) return
    if (!reducedMotion && state !== 'error') return

    const frame = stillFrame(state, goal)
    paintRef.current?.(frame[0], frame[1])
  }, [goal, live, reducedMotion, state])

  const variables: ScanTextVariables = {
    '--scan-color': color,
    '--scan-tail': `${tail}em`,
    '--scan-angle': `${angle}deg`,
    '--scan-rest-opacity': `${Math.round(restOpacity * 100)}%`,
    ...style,
  }

  const Comp = as as 'span'

  return (
    <Comp
      ref={elRef}
      className={`scan-text${live ? ' scan-text--live' : ''}${className ? ` ${className}` : ''}`}
      data-scan={live ? 'true' : 'false'}
      data-state={state}
      data-caret={caret ? 'true' : 'false'}
      style={variables}
    >
      {children}
      {readout ? (
        <span className="scan-text__readout" ref={readoutRef} style={{ color }} />
      ) : null}
    </Comp>
  )
}

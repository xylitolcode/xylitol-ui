import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from 'react'

import { useReducedMotion } from '../../lib/useReducedMotion'

import {
  buildGeometry,
  measureCharBoxes,
  pathSlice,
  seek,
  EMPTY_GEOMETRY,
  type GhostGeometry,
} from './geometry'
import { GHOST_DEFAULTS, remapTrace, traceProblem, type GhostTrace } from './trace'

import './GhostPath.css'

export type GhostPhase = 'idle' | 'playing' | 'holding' | 'ended'

type GhostPathVariables = CSSProperties & {
  [key: `--ghost-${string}`]: string | number | undefined
}

export interface GhostPathProps {
  /** A recorded path. The component plays data; it never records. */
  trace: GhostTrace
  /** The text being pointed at. Never split, wrapped or restyled. */
  children: string
  /** Playback rate, 1 being the recorded speed. */
  speed?: number
  /** Controlled position, 0 to 1. Supplying it hands the clock to the caller. */
  progress?: number
  /** Step mode: hold at the nth pause until this index changes. */
  pauseAt?: number
  /** Replay from the top 900ms after the last sample. */
  loop?: boolean
  /** What rides the head. */
  hand?: 'dot' | 'ring' | 'none'
  /** Trail colour. Defaults to the inherited ink at 42%. */
  trail?: string
  /** Widest the trail gets, in pixels. Narrower as the head speeds up. */
  weight?: number
  /** Fires when the head enters a pause, with its step index. */
  onStep?: (index: number) => void
  /** Fires on phase changes: idle, playing, holding, ended. */
  onPhase?: (phase: GhostPhase) => void
  /** Element used for the text. Defaults to `span`. */
  as?: ElementType
  className?: string
  style?: CSSProperties
}

/**
 * Replays a recorded pointer path over a paragraph. The path is stored as
 * character offsets, not pixels, so it lands on the same words at any width;
 * the pointer's rhythm is played from the sample clock, not from the path
 * length, so the pauses the recorder captured survive the replay.
 */
export function GhostPath({
  trace,
  children,
  speed = GHOST_DEFAULTS.speed,
  progress,
  pauseAt,
  loop = false,
  hand = 'dot',
  trail,
  weight = GHOST_DEFAULTS.weight,
  onStep,
  onPhase,
  as = 'span',
  className,
  style,
}: GhostPathProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const overlayRef = useRef<HTMLSpanElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const glowRef = useRef<SVGPathElement>(null)
  const headRef = useRef<SVGCircleElement>(null)
  const pulseRef = useRef<SVGCircleElement>(null)

  const geometryRef = useRef<GhostGeometry>(EMPTY_GEOMETRY)
  const clockRef = useRef(0)
  const stepRef = useRef(-1)
  const phaseRef = useRef<GhostPhase>('idle')
  const onStepRef = useRef(onStep)
  const onPhaseRef = useRef(onPhase)
  onStepRef.current = onStep
  onPhaseRef.current = onPhase

  const [geometry, setGeometry] = useState<GhostGeometry>(EMPTY_GEOMETRY)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [phase, setPhase] = useState<GhostPhase>('idle')
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const root = rootRef.current
    const overlay = overlayRef.current
    if (!root || !overlay) return

    const aimed = remapTrace(trace, children)

    if (import.meta.env.DEV) {
      const problem = traceProblem(trace)
      if (problem) console.warn(`[GhostPath] ${problem}`)
    }

    const measure = () => {
      const node = firstTextNode(root)
      if (!node) return

      const rootRect = root.getBoundingClientRect()

      // `inset: 0` would resolve against the inline containing block, which for
      // wrapped text is the rectangle from the first line box to the last —
      // wider than the paragraph. Pin the size to the measured paragraph and
      // take the overlay's own origin as the coordinate system, so the trail
      // stays glued to the text on scroll without a per-frame read.
      overlay.style.width = `${rootRect.width}px`
      overlay.style.height = `${rootRect.height}px`

      const overlayRect = overlay.getBoundingClientRect()

      const offsets = [...new Set(aimed.samples.map((sample) => sample[1]))]
      const boxes = measureCharBoxes(node, offsets)
      const next = buildGeometry(aimed, boxes, {
        left: overlayRect.left,
        top: overlayRect.top,
      })

      geometryRef.current = next
      setGeometry(next)
      setSize({ width: rootRect.width, height: rootRect.height })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(root)
    document.fonts?.ready.then(measure).catch(() => undefined)

    return () => observer.disconnect()
  }, [children, trace])

  useEffect(() => {
    const reported = (next: GhostPhase) => {
      if (phaseRef.current === next) return
      phaseRef.current = next
      setPhase(next)
      onPhaseRef.current?.(next)
    }

    const paint = (field: GhostGeometry, time: number) => {
      const point = seek(field, time)
      const width = penWidth(point.speed, weight)

      const trailEl = trailRef.current
      if (trailEl) {
        trailEl.setAttribute('d', pathSlice(field, 0, point.s))
        trailEl.setAttribute('stroke-width', `${width}`)
      }

      const glowEl = glowRef.current
      if (glowEl) {
        glowEl.setAttribute('d', pathSlice(field, Math.max(0, point.s - 64), point.s))
        glowEl.setAttribute('stroke-width', `${width * 1.3}`)
      }

      for (const dot of [headRef.current, pulseRef.current]) {
        if (!dot) continue
        dot.setAttribute('cx', `${point.x}`)
        dot.setAttribute('cy', `${point.y}`)
      }

      const head = headRef.current
      if (head) head.setAttribute('r', `${weight * 1.05}`)

      const pulse = pulseRef.current
      if (pulse) pulse.setAttribute('r', `${weight * 1.05}`)
    }

    if (!geometry.points.length) {
      reported('idle')
      return
    }

    const duration = geometry.duration

    if (reducedMotion) {
      // Motion is rhetoric; the stops are content. Park the hand on the last
      // one and leave the trail out entirely.
      const stop = geometry.stops[geometry.stops.length - 1]
      const time = stop ? stop.t : duration
      clockRef.current = time
      paint(geometry, time)
      reported('ended')
      return
    }

    if (progress !== undefined) {
      const time = clamp(progress, 0, 1) * duration
      clockRef.current = time
      paint(geometry, time)
      reported(progress <= 0 ? 'idle' : progress >= 1 ? 'ended' : 'playing')
      return
    }

    if (pauseAt !== undefined) {
      const stop = geometry.stops[Math.min(Math.max(pauseAt, 0), geometry.stops.length - 1)]
      if (!stop) {
        reported('idle')
        return
      }
      clockRef.current = stop.t
      paint(geometry, stop.t)
      reported('holding')
      stepRef.current = pauseAt
      onStepRef.current?.(pauseAt)
      return
    }

    let frame = 0
    let timer = 0
    let last = 0

    if (clockRef.current >= duration) clockRef.current = 0
    reported('playing')

    const tick = (now: number) => {
      const delta = last ? Math.min(64, now - last) : 16
      last = now
      clockRef.current += delta * Math.max(speed, 0.05)

      if (clockRef.current >= duration) {
        clockRef.current = duration
        paint(geometry, duration)
        reported('ended')

        if (loop) {
          timer = window.setTimeout(() => {
            clockRef.current = 0
            last = 0
            reported('playing')
            frame = requestAnimationFrame(tick)
          }, 900)
        }
        return
      }

      paint(geometry, clockRef.current)

      const index = stepAt(geometry, clockRef.current)
      if (index > stepRef.current) {
        stepRef.current = index
        onStepRef.current?.(index)
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [geometry, speed, progress, pauseAt, loop, reducedMotion, weight])

  const variables: GhostPathVariables = {
    '--ghost-trail': trail,
    '--ghost-weight': `${weight}px`,
    ...style,
  }

  const Comp = as as 'span'
  const width = size.width || 1
  const height = size.height || 1

  return (
    <Comp
      ref={rootRef}
      className={`ghost-path${className ? ` ${className}` : ''}`}
      data-phase={phase}
      data-hand={hand}
      data-empty={geometry.points.length ? 'false' : 'true'}
      style={variables}
    >
      {children}
      <span className="ghost-path__overlay" ref={overlayRef} aria-hidden="true">
        <svg
          className="ghost-path__svg"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          focusable="false"
          aria-hidden="true"
        >
          <path ref={trailRef} className="ghost-path__trail" d="" />
          <path ref={glowRef} className="ghost-path__glow" d="" />
          <circle ref={pulseRef} className="ghost-path__pulse" r={weight * 1.05} cx={-99} cy={-99} />
          <circle ref={headRef} className="ghost-path__head" r={weight * 1.05} cx={-99} cy={-99} />
        </svg>
      </span>
    </Comp>
  )
}

/** The recorded text node: the first child that carries characters. */
function firstTextNode(root: Element): Text | null {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').length > 0) {
      return node as Text
    }
  }
  return null
}

function stepAt(geometry: GhostGeometry, time: number) {
  let index = -1
  for (const stop of geometry.stops) {
    if (stop.t > time) break
    index++
  }
  return index
}

/** Fast hands get thin lines; the pen is a function of speed, not of style. */
function penWidth(speed: number, weight: number) {
  return clamp(weight / (1 + speed * 0.5), 1.4, weight)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

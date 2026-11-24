import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { useReducedMotion } from '../../lib/useReducedMotion'

import './DitherButton.css'

export type DitherButtonState = 'idle' | 'busy' | 'done'

type DitherVariables = CSSProperties & {
  [key: `--dither-${string}`]: string | number | undefined
}

export interface DitherButtonProps {
  /** Resting label. */
  children: ReactNode
  /**
   * Work that runs on press. The button holds `busy` for as long as the returned
   * promise is pending and falls back to `idle` if it rejects. Leave it out and
   * the button only ripples — it never leaves `idle`.
   */
  onAction?: () => Promise<unknown> | unknown
  /** Label while the action is pending. Defaults to `children`. */
  busyLabel?: ReactNode
  /** Label once the action settles. Defaults to `children`. */
  doneLabel?: ReactNode
  /** Milliseconds the done label stays pinned. `0` keeps it until the next press. */
  doneHold?: number
  /** Accent the surface, the ring and the dust are mixed from. */
  color?: string
  /** Radius of the pointer field, in pixels. */
  radius?: number
  /** Cell pitch in pixels. Below 3 the seam closes and the field turns solid. */
  cell?: number
  /** Sparks riding on top of the ordered field, 0 to 1. */
  spark?: number
  /** Trailing mark. `null` drops it. */
  icon?: ReactNode | null
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  style?: CSSProperties
}

export const DITHER_DEFAULTS = {
  color: '#3074FE',
  radius: 68,
  cell: 4,
  spark: 0.18,
  doneHold: 1600,
} as const

const SEAM = 1

/** 4×4 Bayer matrix: the ordered thresholds that turn a level into dots. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const

/** Resting coverage of the field. */
const REST_LEVEL = 0.14
/** Alpha ceiling for a lit cell, so a dense halo still reads as dots. */
const DUST_CEIL = 0.34
const DECAY_MS = 380
const RIPPLE_MS = 760
const RIPPLE_BAND = 20
const RIPPLE_SPARK = 0.22
const MAX_RIPPLES = 5

/** Four steps, like a 2-bit ramp: sparks land on a rung instead of a continuum. */
const LEVELS = [0.09, 0.15, 0.22, 0.29] as const

interface Cell {
  x: number
  y: number
  /** Order threshold this cell answers to. */
  t: number
  /** Alpha contributed by a spark, decaying every frame. */
  lit: number
}

interface Ripple {
  x: number
  y: number
  t0: number
  strength: number
}

interface Point {
  x: number
  y: number
}

function channels(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim()
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : clean

  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return [255, 255, 255]

  const value = Number.parseInt(full, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/**
 * The dust is the accent pulled most of the way to white, so a lit cell reads as
 * light coming out of the surface instead of white noise sitting on top of it.
 */
function dustOf(hex: string, whiteShare = 0.84): [number, number, number] {
  const base = channels(hex)
  const mix = (channel: number) => Math.round(channel * (1 - whiteShare) + 255 * whiteShare)
  return [mix(base[0]), mix(base[1]), mix(base[2])]
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function pickLevel() {
  return LEVELS[Math.floor(Math.random() * LEVELS.length)]
}

/** The component's own mark: the field's cell, nine of them. */
function DotMark() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <circle key={`${row}-${col}`} cx={2 + col * 4} cy={2 + row * 4} r={1.15} />
        )),
      )}
    </svg>
  )
}

/** The check is drawn in the same dots, so the payoff never leaves the language. */
function CheckMark() {
  const dots: readonly (readonly [number, number])[] = [
    [2.2, 6.2],
    [3.7, 7.8],
    [5.2, 9.4],
    [7.4, 6.4],
    [9.8, 3.0],
  ]

  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {dots.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.05} />
      ))}
    </svg>
  )
}

/**
 * A pill whose surface is a field of cells. Light is not a gradient: an ordered
 * Bayer matrix decides which cells switch on, so the pointer halo arrives as
 * rings of dots that cross exact thresholds instead of fading like a haze. A
 * scatter of sparks rides on top, and pressing sends a ring outward that picks
 * cells off as it passes.
 */
export function DitherButton({
  children,
  onAction,
  busyLabel,
  doneLabel,
  doneHold = DITHER_DEFAULTS.doneHold,
  color = DITHER_DEFAULTS.color,
  radius = DITHER_DEFAULTS.radius,
  cell = DITHER_DEFAULTS.cell,
  spark = DITHER_DEFAULTS.spark,
  icon,
  disabled = false,
  type = 'button',
  className,
  style,
}: DitherButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const kickRef = useRef<(() => void) | null>(null)
  const holdRef = useRef<number | null>(null)
  const aliveRef = useRef(true)
  const runRef = useRef(0)
  const stateRef = useRef<DitherButtonState>('idle')
  const busyRef = useRef(false)
  const [state, setState] = useState<DitherButtonState>('idle')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    stateRef.current = state
    busyRef.current = state === 'busy'
    if (state === 'busy') kickRef.current?.()
  }, [state])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (holdRef.current !== null) window.clearTimeout(holdRef.current)
    }
  }, [])

  useEffect(() => {
    const button = buttonRef.current
    const canvas = canvasRef.current
    if (!button || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dust = dustOf(color)
    const pitch = Math.max(3, cell)
    const inner = pitch - SEAM
    const half = inner / 2

    const cells: Cell[] = []
    const ripples: Ripple[] = []
    const view = { width: 0, height: 0 }
    let pointer: Point | null = null
    let hovering = false
    let awake = false
    let last = 0
    let frame = 0

    const paint = (now: number) => {
      ctx.clearRect(0, 0, view.width, view.height)
      const live = ripples.filter((ripple) => now - ripple.t0 < RIPPLE_MS)
      const maxRing = Math.hypot(view.width, view.height) * 0.92
      const reach = Math.max(1, radius)

      for (const entry of cells) {
        const cx = entry.x + half
        const cy = entry.y + half
        let level = REST_LEVEL

        if (pointer) {
          const falloff = clamp01(1 - Math.hypot(cx - pointer.x, cy - pointer.y) / reach)
          // Smoothstep, so the edge of the reach is not a visible circle.
          const halo = falloff * falloff * (3 - 2 * falloff)
          if (halo > level) level = halo
        }

        for (const ripple of live) {
          const phase = (now - ripple.t0) / RIPPLE_MS
          if (
            Math.abs(Math.hypot(cx - ripple.x, cy - ripple.y) - phase * maxRing) <
            RIPPLE_BAND / 2
          ) {
            const ring = (1 - phase * 0.5) * ripple.strength
            if (ring > level) level = ring
          }
        }

        let alpha = level > entry.t ? 0.055 + level * 0.3 : 0
        if (entry.lit > alpha) alpha = entry.lit
        if (alpha <= 0.004) continue
        if (alpha > DUST_CEIL) alpha = DUST_CEIL

        ctx.fillStyle = `rgba(${dust[0]}, ${dust[1]}, ${dust[2]}, ${alpha.toFixed(3)})`
        ctx.fillRect(entry.x, entry.y, inner, inner)
      }
    }

    const measure = () => {
      // The canvas sits inside the border box, so the grid is measured on the
      // padding box — otherwise the border clips the last row and column.
      const width = button.clientWidth
      const height = button.clientHeight
      view.width = width
      view.height = height

      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      const cols = Math.ceil(width / pitch)
      const rows = Math.ceil(height / pitch)
      // Centre the grid: the unused sliver is split between both edges.
      const offsetX = (width - cols * pitch) / 2
      const offsetY = (height - rows * pitch) / 2

      cells.length = 0
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const order = BAYER[(row % 4) * 4 + (col % 4)]
          cells.push({
            x: offsetX + col * pitch,
            y: offsetY + row * pitch,
            // Ordered skeleton with a hair of jitter, so the 4×4 tile does not
            // read as a lattice on a flat surface.
            t: (order + 0.5 + Math.random() * 1.4) / 17,
            lit: 0,
          })
        }
      }

      paint(performance.now())
    }

    const ignite = (entry: Cell, amount: number) => {
      entry.lit = Math.max(entry.lit, pickLevel() * amount)
    }

    const step = (now: number) => {
      frame = 0
      if (!awake) return

      if (reducedMotion) {
        ripples.length = 0
        for (const entry of cells) entry.lit = 0
        paint(now)
        awake = false
        return
      }

      if (!last) last = now
      const delta = Math.min(48, now - last)
      last = now
      const steps = delta / 16.67
      const decay = Math.exp(-delta / DECAY_MS)
      const maxRing = Math.hypot(view.width, view.height) * 0.92

      for (let index = ripples.length - 1; index >= 0; index -= 1) {
        if (now - ripples[index].t0 >= RIPPLE_MS) ripples.splice(index, 1)
      }

      let any = false
      const seen = hovering ? pointer : null

      for (const entry of cells) {
        entry.lit *= decay
        if (entry.lit < 0.004) entry.lit = 0

        const cx = entry.x + half
        const cy = entry.y + half

        if (seen) {
          const falloff = clamp01(1 - Math.hypot(cx - seen.x, cy - seen.y) / Math.max(1, radius))
          if (falloff > 0 && Math.random() < falloff ** 1.6 * spark * steps) {
            ignite(entry, 0.55 + 0.45 * falloff)
          }
        }

        for (const ripple of ripples) {
          const phase = (now - ripple.t0) / RIPPLE_MS
          if (
            Math.abs(Math.hypot(cx - ripple.x, cy - ripple.y) - phase * maxRing) <
              RIPPLE_BAND / 2 &&
            Math.random() < RIPPLE_SPARK * ripple.strength * steps
          ) {
            ignite(entry, 1 - phase * 0.55)
          }
        }

        if (busyRef.current && Math.random() < 0.004 * steps) ignite(entry, 0.75)

        if (entry.lit > 0) any = true
      }

      paint(now)
      awake = any || hovering || ripples.length > 0 || busyRef.current
      if (awake) frame = window.requestAnimationFrame(step)
    }

    const kick = () => {
      awake = true
      if (frame) return
      last = 0
      frame = window.requestAnimationFrame(step)
    }
    kickRef.current = kick

    const toLocal = (event: PointerEvent): Point => {
      const rect = button.getBoundingClientRect()
      // The surface can be scaled by an ancestor; map back into layout pixels.
      const scaleX = rect.width ? button.offsetWidth / rect.width : 1
      const scaleY = rect.height ? button.offsetHeight / rect.height : 1
      return {
        // clientLeft and clientTop are the border widths: the canvas starts there.
        x: (event.clientX - rect.left) * scaleX - button.clientLeft,
        y: (event.clientY - rect.top) * scaleY - button.clientTop,
      }
    }

    const pushRipple = (point: Point, strength: number) => {
      if (reducedMotion) return
      if (ripples.length >= MAX_RIPPLES) ripples.shift()
      ripples.push({ ...point, t0: performance.now(), strength })
      kick()
    }

    const onEnter = (event: PointerEvent) => {
      pointer = toLocal(event)
      hovering = true
      if (event.pointerType === 'mouse') pushRipple(pointer, 0.6)
      kick()
    }

    const onMove = (event: PointerEvent) => {
      pointer = toLocal(event)
      kick()
    }

    const onLeave = () => {
      hovering = false
      kick()
    }

    const onDown = (event: PointerEvent) => {
      pushRipple(toLocal(event), 1)
    }

    const onKeyClick = (event: MouseEvent) => {
      // Keyboard activation arrives with no coordinates, so the ring starts centred.
      if (event.detail === 0) pushRipple({ x: view.width / 2, y: view.height / 2 }, 1)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(button)
    button.addEventListener('pointerenter', onEnter)
    button.addEventListener('pointermove', onMove)
    button.addEventListener('pointerleave', onLeave)
    button.addEventListener('pointerdown', onDown)
    button.addEventListener('click', onKeyClick)

    measure()
    kick()

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer.disconnect()
      button.removeEventListener('pointerenter', onEnter)
      button.removeEventListener('pointermove', onMove)
      button.removeEventListener('pointerleave', onLeave)
      button.removeEventListener('pointerdown', onDown)
      button.removeEventListener('click', onKeyClick)
      if (kickRef.current === kick) kickRef.current = null
    }
  }, [cell, color, radius, spark, reducedMotion])

  async function press() {
    if (disabled || stateRef.current === 'busy') return
    if (!onAction) return

    const run = runRef.current + 1
    runRef.current = run
    setState('busy')

    try {
      await onAction()
    } catch {
      if (aliveRef.current && runRef.current === run) setState('idle')
      return
    }

    if (!aliveRef.current || runRef.current !== run) return

    setState('done')
    if (holdRef.current !== null) window.clearTimeout(holdRef.current)
    if (doneHold > 0) {
      holdRef.current = window.setTimeout(() => {
        if (aliveRef.current) setState('idle')
      }, doneHold)
    }
  }

  const busy = state === 'busy'
  const label = busy ? busyLabel ?? children : state === 'done' ? doneLabel ?? children : children
  const mark = icon === null ? null : icon ?? (state === 'done' ? <CheckMark /> : <DotMark />)

  const variables: DitherVariables = {
    '--dither-color': color,
    ...style,
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`dither-button${className ? ` ${className}` : ''}`}
      data-state={state}
      disabled={disabled}
      aria-busy={busy}
      style={variables}
      onClick={press}
    >
      <canvas ref={canvasRef} className="dither-button__field" aria-hidden="true" />
      <span className="dither-button__label" key={state} aria-live="polite">
        {label}
      </span>
      {mark ? (
        <span className="dither-button__mark" key={`mark-${state}`} aria-hidden="true">
          {mark}
        </span>
      ) : null}
    </button>
  )
}

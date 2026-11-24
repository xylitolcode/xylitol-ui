import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import './HollowFlowText.css'

const VIEWBOX_WIDTH = 1200
const VIEWBOX_HEIGHT = 240
const TEXT_BASELINE = 166
const DEFAULT_TEXT_LENGTH = 1080
const DEFAULT_RADIUS = 145
const FOLLOW_STRENGTH = 0.2

export const DEFAULT_HOLLOW_FLOW_COLORS = [
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#fb923c',
  '#facc15',
] as const

type HollowFlowTextVariables = CSSProperties & {
  [key: `--hft-${string}`]: string | number | undefined
}

export interface HollowFlowTextProps {
  /** Text rendered as the hollow wordmark. */
  children: string
  /** Ordered colors used by the animated outline and the hover reveal. */
  colors?: readonly string[]
  /** Seconds for one full pass of the flowing gradient. */
  duration?: number
  /** Seconds for one pass of the travelling highlight. */
  sparkDuration?: number
  /** Reveal radius in SVG viewBox units. */
  radius?: number
  /** Stretched text width. Set to null to keep the natural text width. */
  textLength?: number | null
  /** Font size in SVG viewBox units. */
  fontSize?: number
  /** Font family used by the wordmark. Defaults to the inherited font. */
  fontFamily?: string
  /** Font weight used by the wordmark. */
  fontWeight?: string | number
  /** Letter spacing used by the wordmark. */
  letterSpacing?: string | number
  /** Color of the always-visible hairline outline. */
  outlineColor?: string
  /** Width of the always-visible hairline outline. */
  outlineWidth?: number
  /** Width of the animated colored outline. */
  flowWidth?: number
  /** Width of the travelling highlight stroke. */
  sparkWidth?: number
  /** Opacity of the gradient fill revealed under the pointer. */
  revealOpacity?: number
  /** Opacity of the soft glow around the revealed fill. */
  haloOpacity?: number
  /** Accessible name for the effect. Defaults to children. */
  ariaLabel?: string
  className?: string
  style?: CSSProperties
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

export function HollowFlowText({
  children,
  colors = DEFAULT_HOLLOW_FLOW_COLORS,
  duration = 9,
  sparkDuration = 6.5,
  radius = DEFAULT_RADIUS,
  textLength = DEFAULT_TEXT_LENGTH,
  fontSize = 154,
  fontFamily = 'inherit',
  fontWeight = 800,
  letterSpacing = '-0.055em',
  outlineColor = 'rgba(219, 234, 254, 0.24)',
  outlineWidth = 1.15,
  flowWidth = 1.7,
  sparkWidth = 2.5,
  revealOpacity = 0.96,
  haloOpacity = 0.28,
  ariaLabel,
  className,
  style,
}: HollowFlowTextProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const spotRef = useRef<SVGCircleElement>(null)
  const frameRef = useRef(0)
  const activeRef = useRef(false)
  const targetRef = useRef({ x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 })
  const currentRef = useRef({ ...targetRef.current })
  const [active, setActive] = useState(false)
  const reducedMotion = useReducedMotion()
  const reactId = useId()
  const idPrefix = `hft-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const ids = useMemo(
    () => ({
      gradient: `${idPrefix}-gradient`,
      feather: `${idPrefix}-feather`,
      pointerMask: `${idPrefix}-pointer-mask`,
      lineGlow: `${idPrefix}-line-glow`,
      revealGlow: `${idPrefix}-reveal-glow`,
    }),
    [idPrefix],
  )

  const stops = useMemo(() => {
    const source = colors.length > 0 ? colors : DEFAULT_HOLLOW_FLOW_COLORS
    const palette = [...source]
    if (palette.length > 1 && palette.at(-1) !== palette[0]) {
      palette.push(palette[0])
    }

    return palette.map((color, index, list) => ({
      color,
      offset: `${(index / Math.max(1, list.length - 1)) * 100}%`,
    }))
  }, [colors])

  const gradientSpan = Math.max(VIEWBOX_WIDTH * 0.92, 1000)
  const gradientStart = -gradientSpan * 2
  const gradientEnd = VIEWBOX_WIDTH
  const secondGradientStart = -gradientSpan
  const secondGradientEnd = VIEWBOX_WIDTH + gradientSpan
  const textLengthAttribute = textLength === null ? undefined : textLength

  useEffect(() => {
    return () => {
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const wakeReveal = () => {
    if (frameRef.current !== 0) return

    const draw = () => {
      const current = currentRef.current
      const target = targetRef.current
      current.x += (target.x - current.x) * FOLLOW_STRENGTH
      current.y += (target.y - current.y) * FOLLOW_STRENGTH

      spotRef.current?.setAttribute('cx', current.x.toFixed(2))
      spotRef.current?.setAttribute('cy', current.y.toFixed(2))

      const settled =
        Math.abs(target.x - current.x) < 0.08 &&
        Math.abs(target.y - current.y) < 0.08

      frameRef.current =
        activeRef.current || !settled ? requestAnimationFrame(draw) : 0
    }

    frameRef.current = requestAnimationFrame(draw)
  }

  const updateTarget = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return

    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY

    const local = point.matrixTransform(matrix.inverse())
    targetRef.current = {
      x: Math.max(0, Math.min(VIEWBOX_WIDTH, local.x)),
      y: Math.max(0, Math.min(VIEWBOX_HEIGHT, local.y)),
    }

    if (!activeRef.current) {
      activeRef.current = true
      setActive(true)
    }
    wakeReveal()
  }

  const hideReveal = () => {
    activeRef.current = false
    setActive(false)
    wakeReveal()
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    updateTarget(event)
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    updateTarget(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'mouse') hideReveal()
  }

  const variables: HollowFlowTextVariables = {
    '--hft-outline-color': outlineColor,
    '--hft-outline-width': `${outlineWidth}px`,
    '--hft-flow-width': `${flowWidth}px`,
    '--hft-spark-width': `${sparkWidth}px`,
    '--hft-font-size': `${fontSize}px`,
    '--hft-font-family': fontFamily,
    '--hft-font-weight': fontWeight,
    '--hft-letter-spacing': typeof letterSpacing === 'number' ? `${letterSpacing}px` : letterSpacing,
    '--hft-reveal-opacity': revealOpacity,
    '--hft-halo-opacity': haloOpacity,
    ...style,
  }

  const textProps = {
    x: VIEWBOX_WIDTH / 2,
    y: TEXT_BASELINE,
    textLength: textLengthAttribute,
    lengthAdjust: 'spacingAndGlyphs' as const,
  }

  return (
    <svg
      ref={svgRef}
      className={`hollow-flow-text${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={ariaLabel ?? children}
      style={variables}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={hideReveal}
      onPointerCancel={hideReveal}
    >
      <defs>
        <linearGradient
          id={ids.gradient}
          gradientUnits="userSpaceOnUse"
          x1={gradientStart}
          y1="0"
          x2={secondGradientStart}
          y2="0"
          spreadMethod="repeat"
        >
          {stops.map((stop) => (
            <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
          ))}
          {!reducedMotion && (
            <>
              <animate
                attributeName="x1"
                values={`${gradientStart};${gradientEnd}`}
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values={`${secondGradientStart};${secondGradientEnd}`}
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
            </>
          )}
        </linearGradient>

        <radialGradient id={ids.feather} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="52%" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="78%" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <mask
          id={ids.pointerMask}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
        >
          <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#000" />
          <circle
            ref={spotRef}
            className="hollow-flow-text__reveal-spot"
            cx={VIEWBOX_WIDTH / 2}
            cy={VIEWBOX_HEIGHT / 2}
            r={radius}
            fill={`url(#${ids.feather})`}
          />
        </mask>

        <filter id={ids.lineGlow} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={ids.revealGlow} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <rect
        className="hollow-flow-text__hit-area"
        width={VIEWBOX_WIDTH}
        height={VIEWBOX_HEIGHT}
        fill="#fff"
        fillOpacity="0"
        pointerEvents="all"
      />

      <text className="hollow-flow-text__text hollow-flow-text__base" {...textProps}>
        {children}
      </text>

      <text
        className="hollow-flow-text__text hollow-flow-text__flow-glow"
        stroke={`url(#${ids.gradient})`}
        filter={`url(#${ids.lineGlow})`}
        {...textProps}
      >
        {children}
      </text>

      <text
        className="hollow-flow-text__text hollow-flow-text__flow"
        stroke={`url(#${ids.gradient})`}
        {...textProps}
      >
        {children}
      </text>

      <text
        className="hollow-flow-text__text hollow-flow-text__spark"
        stroke={`url(#${ids.gradient})`}
        pathLength="1000"
        {...textProps}
      >
        {children}
        {!reducedMotion && (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-1000"
            dur={`${sparkDuration}s`}
            repeatCount="indefinite"
          />
        )}
      </text>

      <g className="hollow-flow-text__reveal" mask={`url(#${ids.pointerMask})`}>
        <text
          className="hollow-flow-text__text hollow-flow-text__reveal-halo"
          fill={`url(#${ids.gradient})`}
          filter={`url(#${ids.revealGlow})`}
          {...textProps}
        >
          {children}
        </text>
        <text
          className="hollow-flow-text__text hollow-flow-text__reveal-fill"
          fill={`url(#${ids.gradient})`}
          {...textProps}
        >
          {children}
        </text>
        <text className="hollow-flow-text__text hollow-flow-text__reveal-edge" {...textProps}>
          {children}
        </text>
      </g>
    </svg>
  )
}

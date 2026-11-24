import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

import { HintArrow } from './HintArrow'
import { SelectionBox } from './SelectionBox'
import { useSelectionConfig, type SelectionSide } from './context'
import { HIDDEN_CLIP, OPEN_CLIP, sideOfPoint } from './geometry'
import { useSpringRect, type BoxRect } from './useSpringRect'

type SelectionVariables = CSSProperties & {
  [key: `--das-${string}`]: string | number | undefined
}

interface ActiveState {
  /** 0 is the leading icon, 1..n are the words, -1 is the whole target. */
  layer: number
  width: number
  height: number
}

/** Layer index reserved for "the whole target", used when the target is pinned. */
const WHOLE_LAYER = -1

export interface SelectionTargetProps {
  /** Words that get their own box. A string is split on whitespace. */
  words: string | readonly string[]
  /** Accessible name. Defaults to the words joined by spaces. */
  label?: string
  /** Renders the target as a link; without it the target is inert text. */
  href?: string
  /** Link target. Defaults to a new tab. */
  target?: string
  /** Optional leading icon (image, svg or any node sized to the 1.1em box). */
  icon?: ReactNode
  /** Handwritten callout shown above the target until the first interaction. */
  hint?: string
  /**
   * Keeps the box on the whole target instead of only while the pointer is
   * inside. Useful for a "picked" item; the frame, sweep and badge stay put.
   */
  selected?: boolean
  /** Called on click / Enter / Space. Passing it makes the target selectable. */
  onSelect?: () => void
  /** Overrides the shared sweep color for this target; `transparent` keeps the frame only. */
  fillColor?: string
  /** Overrides the shared sweep copy color for this target. */
  fillTextColor?: string
  className?: string
  style?: CSSProperties
}

/**
 * One hoverable unit inside a `DirectionAwareSelection`: an optional icon plus
 * one or more words, each of which receives the selection box on pointer
 * enter. The box is measured locally, so the target works inline in flowing
 * text and inside scaled containers.
 */
export function SelectionTarget({
  words: wordsProp,
  label,
  href,
  target = '_blank',
  icon,
  hint,
  selected,
  onSelect,
  fillColor: fillColorProp,
  fillTextColor: fillTextColorProp,
  className,
  style,
}: SelectionTargetProps) {
  const config = useSelectionConfig()
  const {
    color,
    bounce,
    showSize,
    fillOn,
    padX,
    padY,
    frameWidth,
    handleFill,
    fillColor: configFillColor,
    fillTextColor: configFillTextColor,
    reducedMotion,
  } = config

  const words = useMemo(() => {
    if (typeof wordsProp === 'string') {
      return wordsProp.trim().split(/\s+/).filter(Boolean)
    }
    return [...wordsProp]
  }, [wordsProp])

  const rootRef = useRef<HTMLElement | null>(null)
  const layerRefs = useRef<Array<HTMLSpanElement | null>>([])
  const fillRef = useRef<HTMLSpanElement>(null)
  const fillOpenRef = useRef(false)
  const hoveringRef = useRef(false)
  const selectedRef = useRef(Boolean(selected))

  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<ActiveState | null>(null)
  const [hintHidden, setHintHidden] = useState(false)

  const { ref: boxRef, moveTo } = useSpringRect(bounce, reducedMotion)

  selectedRef.current = Boolean(selected)

  const setRoot = (node: HTMLElement | null) => {
    rootRef.current = node
  }

  const setLayer = (index: number) => (node: HTMLSpanElement | null) => {
    layerRefs.current[index] = node
  }

  /**
   * Boxes are measured against the target itself and divided by its current
   * scale, so the overlay stays glued to the text when the target is transformed.
   */
  const measure = (layer: number): BoxRect | null => {
    const root = rootRef.current
    if (!root) return null

    const node = layer === WHOLE_LAYER ? root : layerRefs.current[layer]
    if (!node) return null

    const rootRect = root.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    const scale = rootRect.width / (root.offsetWidth || rootRect.width) || 1

    return {
      x: (nodeRect.left - rootRect.left) / scale - padX,
      y: (nodeRect.top - rootRect.top) / scale - padY,
      width: nodeRect.width / scale + padX * 2,
      height: nodeRect.height / scale + padY * 2,
    }
  }

  const openFill = (side: SelectionSide) => {
    const element = fillRef.current
    if (!element) return

    if (reducedMotion) {
      element.style.clipPath = OPEN_CLIP
      fillOpenRef.current = true
      return
    }

    // Ongoing glides keep painting; only a fresh entry starts a new sweep.
    if (fillOpenRef.current) return

    element.style.transition = 'none'
    element.style.clipPath = HIDDEN_CLIP[side]
    // Commit the collapsed edge before the CSS transition is re-enabled.
    void element.offsetWidth
    element.style.transition = ''
    element.style.clipPath = OPEN_CLIP
    fillOpenRef.current = true
  }

  const closeFill = (side: SelectionSide) => {
    const element = fillRef.current
    if (!element) return

    element.style.clipPath = HIDDEN_CLIP[side]
    fillOpenRef.current = false
  }

  const fillEnabled = (layer: number) =>
    fillOn === 'both' || (fillOn === 'icon' && layer === 0) || (fillOn === 'word' && layer > 0)

  const paint = (layer: number, side: SelectionSide) => {
    const rect = measure(layer)
    if (!rect) return

    setActive({ layer, width: Math.round(rect.width), height: Math.round(rect.height) })
    setVisible(true)
    moveTo(rect)

    // The pinned box always keeps its sweep so the whole target stays highlighted.
    if (layer === WHOLE_LAYER || fillEnabled(layer)) openFill(side)
    else closeFill(side)
  }

  const activate = (layer: number, side: SelectionSide) => {
    if (selectedRef.current) return
    hoveringRef.current = true
    setHintHidden(true)
    paint(layer, side)
  }

  const deactivate = (side: SelectionSide) => {
    hoveringRef.current = false
    if (selectedRef.current) return
    setVisible(false)
    closeFill(side)
    moveTo(null)
  }

  const handleRootLeave = (event: ReactPointerEvent<HTMLElement>) => {
    deactivate(sideOfPoint(event, rootRef.current))
  }

  const handleFocus = (event: ReactFocusEvent<HTMLElement>) => {
    if (selectedRef.current) return
    if (!event.currentTarget.matches(':focus-visible')) return
    setHintHidden(true)
    paint(icon ? 0 : 1, 'left')
  }

  const handleBlur = () => {
    if (selectedRef.current) return
    setVisible(false)
    closeFill('left')
    moveTo(null)
  }

  const commitSelection = () => {
    onSelect?.()
  }

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!onSelect) return
    event.preventDefault()
    commitSelection()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!onSelect) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    commitSelection()
  }

  /** Layer index the pointer currently sits on, read from the CSS hover state. */
  const hoveredLayer = (): number | null => {
    const nodes = layerRefs.current
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      if (node && node.matches(':hover')) return index
    }
    return null
  }

  /** Pins the box over the whole target and keeps it glued through re-layouts. */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (!selected) {
      const layer = hoveredLayer()
      if (layer !== null) {
        hoveringRef.current = true
        paint(layer, 'left')
      } else {
        hoveringRef.current = false
        setVisible(false)
        closeFill('left')
        moveTo(null)
      }
      return
    }

    setHintHidden(true)

    const pin = () => {
      paint(WHOLE_LAYER, 'left')
      // `paint` reads state setters from the render that created this effect.
    }

    pin()

    const observer = new ResizeObserver(pin)
    observer.observe(root)

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, words.length])

  const kind = !active || active.layer === WHOLE_LAYER ? 'whole' : active.layer === 0 ? 'icon' : 'word'
  const activeWord = active && active.layer > 0 ? words[active.layer - 1] : null

  const variables: SelectionVariables = {
    '--das-color': color,
    '--das-pad-x': `${padX}px`,
    '--das-pad-y': `${padY}px`,
    '--das-frame-width': `${frameWidth}px`,
    '--das-handle-fill': handleFill,
    '--das-fill': fillColorProp ?? configFillColor,
    ...style,
  }

  const glyphColor = fillTextColorProp ?? configFillTextColor

  const iconGlyph = icon ? (
    <span className="direction-aware-selection__glyph-icon">{icon}</span>
  ) : null

  const wordGlyphs = words.map((word, index) => (
    <span key={`glyph-${index}-${word}`} className="direction-aware-selection__glyph-word">
      {word}
    </span>
  ))

  const copy =
    kind === 'whole' ? (
      <span className="direction-aware-selection__glyph-whole">
        {iconGlyph}
        {wordGlyphs}
      </span>
    ) : kind === 'icon' ? (
      iconGlyph
    ) : activeWord ? (
      <span className="direction-aware-selection__glyph-word">{activeWord}</span>
    ) : null

  const content = (
    <>
      {icon ? (
        <span
          ref={setLayer(0)}
          className="direction-aware-selection__icon"
          onPointerEnter={(event) => activate(0, sideOfPoint(event, event.currentTarget))}
        >
          {icon}
        </span>
      ) : null}

      {words.map((word, index) => (
        <span
          key={`${index}-${word}`}
          ref={setLayer(index + 1)}
          className="direction-aware-selection__word"
          onPointerEnter={(event) => activate(index + 1, sideOfPoint(event, event.currentTarget))}
        >
          {word}
        </span>
      ))}

      <SelectionBox
        boxRef={boxRef}
        fillRef={fillRef}
        visible={visible}
        showSize={showSize}
        reducedMotion={reducedMotion}
        kind={kind}
        size={active ? { width: active.width, height: active.height } : null}
        glyphColor={glyphColor}
        content={copy}
      />

      {hint ? <HintArrow label={hint} hidden={hintHidden} reducedMotion={reducedMotion} /> : null}
    </>
  )

  const rootClassName = ['direction-aware-selection__target', className].filter(Boolean).join(' ')
  const accessibleName = label ?? words.join(' ')
  const selectable = Boolean(onSelect)

  if (href) {
    return (
      <a
        ref={setRoot}
        href={href}
        target={target}
        rel="noreferrer"
        aria-label={accessibleName}
        className={rootClassName}
        data-selected={selectable ? String(Boolean(selected)) : undefined}
        style={variables}
        onPointerLeave={handleRootLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
      >
        {content}
      </a>
    )
  }

  return (
    <span
      ref={setRoot}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-label={selectable ? accessibleName : undefined}
      aria-pressed={selectable ? Boolean(selected) : undefined}
      className={rootClassName}
      data-selected={selectable ? String(Boolean(selected)) : undefined}
      style={variables}
      onPointerLeave={handleRootLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {content}
    </span>
  )
}

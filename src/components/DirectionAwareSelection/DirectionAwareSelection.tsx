import { useMemo, type ReactNode } from 'react'

import { useReducedMotion } from '../../lib/useReducedMotion'
import {
  DEFAULT_SELECTION_COLOR,
  SelectionContext,
  type SelectionConfig,
  type SelectionFillOn,
} from './context'

import './DirectionAwareSelection.css'

export interface DirectionAwareSelectionProps {
  /** Accent used by the frame, the corner handles, the sweep and the badge. */
  color?: string
  /** Spring overshoot shared by every target: 0 settles, 1 bounces hard. */
  bounce?: number
  /** Shows a live `width × height` badge under the frame. */
  showSize?: boolean
  /** Which hovered layer gets the direction aware sweep. */
  fillOn?: SelectionFillOn
  /** Horizontal padding between the text box and the frame, in pixels. */
  padX?: number
  /** Vertical padding between the text box and the frame, in pixels. */
  padY?: number
  /** Frame border width, in pixels. */
  frameWidth?: number
  /** Fill behind the corner handles; use the page background to mask the frame line. */
  handleFill?: string
  /**
   * Background painted by the direction aware sweep. Pass `transparent` to keep
   * the frame only, or a translucent accent to keep the text readable.
   */
  fillColor?: string
  /** Color of the copy painted over the sweep. Use `inherit` for outline-only hovers. */
  fillTextColor?: string
  children: ReactNode
}

/**
 * Shares the look and the motion of a selection box between every target in
 * the block, and wires `prefers-reduced-motion` into all of them. Renders no
 * markup of its own, so it can wrap any paragraph or heading.
 */
export function DirectionAwareSelection({
  color = DEFAULT_SELECTION_COLOR,
  bounce = 0.15,
  showSize = true,
  fillOn = 'both',
  padX = 10,
  padY = 6,
  frameWidth = 2,
  handleFill = 'transparent',
  fillColor,
  fillTextColor = '#fff',
  children,
}: DirectionAwareSelectionProps) {
  const reducedMotion = useReducedMotion()

  const config = useMemo<SelectionConfig>(
    () => ({
      color,
      bounce,
      showSize,
      fillOn,
      padX,
      padY,
      frameWidth,
      handleFill,
      fillColor: fillColor ?? color,
      fillTextColor,
      reducedMotion,
    }),
    [
      color,
      bounce,
      showSize,
      fillOn,
      padX,
      padY,
      frameWidth,
      handleFill,
      fillColor,
      fillTextColor,
      reducedMotion,
    ],
  )

  return <SelectionContext.Provider value={config}>{children}</SelectionContext.Provider>
}

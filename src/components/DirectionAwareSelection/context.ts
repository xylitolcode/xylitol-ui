import { createContext, useContext } from 'react'

/** Edge of the hovered box the pointer came in through. */
export type SelectionSide = 'left' | 'right' | 'top' | 'bottom'

/**
 * Which hovered layer gets the direction aware color sweep:
 * `'icon'` only the leading icon, `'word'` only the words, `'both'` every
 * layer, `'none'` disables the sweep and keeps the frame only.
 */
export type SelectionFillOn = 'icon' | 'word' | 'both' | 'none'

export interface SelectionConfig {
  /** Accent used by the frame, the corner handles, the sweep and the badge. */
  color: string
  /** Spring overshoot: 0 settles without bounce, 1 is very springy. */
  bounce: number
  /** Shows a live `width × height` badge under the frame. */
  showSize: boolean
  fillOn: SelectionFillOn
  /** Horizontal padding between the hovered box and the frame, in pixels. */
  padX: number
  /** Vertical padding between the hovered box and the frame, in pixels. */
  padY: number
  frameWidth: number
  /** Fill behind the corner handles. Set it to the page background to mask the frame line. */
  handleFill: string
  /** Background painted by the sweep. `transparent` leaves the frame only. */
  fillColor: string
  /** Color of the copy painted over the sweep, so the word stays readable. */
  fillTextColor: string
  reducedMotion: boolean
}

export const DEFAULT_SELECTION_COLOR = '#3074FE'

export const SELECTION_DEFAULTS: SelectionConfig = {
  color: DEFAULT_SELECTION_COLOR,
  bounce: 0.15,
  showSize: true,
  fillOn: 'both',
  padX: 10,
  padY: 6,
  frameWidth: 2,
  handleFill: 'transparent',
  fillColor: DEFAULT_SELECTION_COLOR,
  fillTextColor: '#fff',
  reducedMotion: false,
}

export const SelectionContext = createContext<SelectionConfig>(SELECTION_DEFAULTS)

export function useSelectionConfig() {
  return useContext(SelectionContext)
}

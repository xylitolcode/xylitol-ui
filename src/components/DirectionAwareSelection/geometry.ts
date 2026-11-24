import type { SelectionSide } from './context'

/** Collapsed clip for each entry edge: the visible area shrinks toward that edge. */
export const HIDDEN_CLIP: Record<SelectionSide, string> = {
  left: 'inset(0% 100% 0% 0%)',
  right: 'inset(0% 0% 0% 100%)',
  top: 'inset(0% 0% 100% 0%)',
  bottom: 'inset(100% 0% 0% 0%)',
}

export const OPEN_CLIP = 'inset(0% 0% 0% 0%)'

/**
 * Resolves the edge a pointer crossed by normalizing its position against the
 * center of the element: the dominant axis wins.
 */
export function sideOfPoint(
  point: { clientX: number; clientY: number },
  element: Element | null,
): SelectionSide {
  const rect = element?.getBoundingClientRect()
  if (!rect) return 'left'

  const nx = (point.clientX - (rect.left + rect.width / 2)) / (rect.width / 2 || 1)
  const ny = (point.clientY - (rect.top + rect.height / 2)) / (rect.height / 2 || 1)

  if (Math.abs(nx) > Math.abs(ny)) return nx < 0 ? 'left' : 'right'
  return ny < 0 ? 'top' : 'bottom'
}

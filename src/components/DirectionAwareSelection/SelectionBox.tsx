import type { ReactNode, Ref } from 'react'

import { OdometerNumber } from './OdometerNumber'

export interface SelectionBoxProps {
  boxRef: Ref<HTMLSpanElement>
  fillRef: Ref<HTMLSpanElement>
  visible: boolean
  showSize: boolean
  reducedMotion: boolean
  /** Which copy is painted on top of the accent sweep. */
  kind: 'icon' | 'word' | 'whole'
  content: ReactNode
  /** Unpadded size of the hovered layer, shown in the badge. */
  size: { width: number; height: number } | null
  /** Color of the copy painted over the sweep. `inherit` keeps the text as-is. */
  glyphColor: string
}

/**
 * Everything the pointer paints: the accent sweep, the frame with its corner
 * handles and the size badge. One element carries the geometry, so all three
 * read as a single object while it glides between words.
 */
export function SelectionBox({
  boxRef,
  fillRef,
  visible,
  showSize,
  reducedMotion,
  kind,
  content,
  size,
  glyphColor,
}: SelectionBoxProps) {
  return (
    <span
      ref={boxRef}
      className="direction-aware-selection__box"
      data-visible={visible}
      aria-hidden="true"
    >
      <span ref={fillRef} className="direction-aware-selection__fill">
        <span className="direction-aware-selection__glyph" data-kind={kind} style={{ color: glyphColor }}>
          {content}
        </span>
      </span>

      <span className="direction-aware-selection__frame">
        <span className="direction-aware-selection__handle direction-aware-selection__handle--tl" />
        <span className="direction-aware-selection__handle direction-aware-selection__handle--tr" />
        <span className="direction-aware-selection__handle direction-aware-selection__handle--br" />
        <span className="direction-aware-selection__handle direction-aware-selection__handle--bl" />
      </span>

      {showSize && size ? (
        <span className="direction-aware-selection__badge">
          <OdometerNumber value={size.width} instant={reducedMotion} />
          <span className="direction-aware-selection__badge-sep">×</span>
          <OdometerNumber value={size.height} instant={reducedMotion} />
        </span>
      ) : null}
    </span>
  )
}

export interface HintArrowProps {
  label: string
  hidden: boolean
  reducedMotion: boolean
}

/**
 * Hand drawn arrow plus a handwritten label. The two stroke segments are
 * drawn one after another on mount; the label pops in slightly rotated.
 */
export function HintArrow({ label, hidden, reducedMotion }: HintArrowProps) {
  return (
    <span
      className="direction-aware-selection__hint"
      data-hidden={hidden}
      data-reduced={reducedMotion}
      aria-hidden="true"
    >
      <svg className="direction-aware-selection__hint-arrow" viewBox="0 0 80 46" fill="none">
        <path
          pathLength={1}
          d="M76 9 C 62 3, 47 8, 43 19 C 39 31, 54 33, 50 23 C 46 13, 25 20, 11 41"
        />
        <path pathLength={1} d="M9 29 C 10 33, 10 37, 11 41 C 15 39, 18 38, 22 38" />
      </svg>
      <span className="direction-aware-selection__hint-label">{label}</span>
    </span>
  )
}

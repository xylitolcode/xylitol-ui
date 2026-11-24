const DIGITS = Array.from({ length: 10 }, (_, index) => index)

export interface OdometerNumberProps {
  value: number
  /** Skip the roll and jump straight to the value. */
  instant: boolean
}

/**
 * Digit strip that rolls like a mechanical counter. Every digit is a vertical
 * column of 0-9 and the column is translated to the current value, so changing
 * numbers scrolls through the intermediate digits.
 */
export function OdometerNumber({ value, instant }: OdometerNumberProps) {
  const characters = String(Math.max(0, Math.round(value))).split('')

  return (
    <span className="direction-aware-selection__odometer">
      {characters.map((character, index) => (
        <span className="direction-aware-selection__odometer-digit" key={characters.length - index}>
          <span
            className="direction-aware-selection__odometer-strip"
            data-instant={instant}
            style={{ transform: `translateY(${-Number(character)}em)` }}
          >
            {DIGITS.map((digit) => (
              <span key={digit}>{digit}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

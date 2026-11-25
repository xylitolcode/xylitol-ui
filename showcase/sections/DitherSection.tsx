import { useState } from 'react'

import { DitherButton } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

const COMMAND = 'pnpm add @xylitol0520/ui'

interface ScrubProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

function Scrub({ label, value, min, max, step, display, onChange }: ScrubProps) {
  return (
    <label className="console__scrub">
      <span className="console__scrub-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="console__scrub-value">{display}</span>
    </label>
  )
}

export function DitherSection() {
  const chapter = getChapter('dither')
  const { copy } = useI18n()
  const [radius, setRadius] = useState(68)
  const [spark, setSpark] = useState(0.18)
  const [pitch, setPitch] = useState(4)

  return (
    <Chapter {...chapter}>
      <div className="console" data-reveal>
        <div className="console__stage dither-stage">
          <DitherButton
            radius={radius}
            spark={spark}
            cell={pitch}
            busyLabel={copy.dither.busy}
            doneLabel={copy.dither.done}
            onAction={() => navigator.clipboard.writeText(COMMAND)}
          >
            {copy.dither.button}
          </DitherButton>
        </div>

        <div className="console__bar">
          <div className="dither-scrubs">
            <Scrub
              label={copy.dither.radius}
              value={radius}
              min={24}
              max={120}
              step={1}
              display={`${radius}px`}
              onChange={setRadius}
            />
            <Scrub
              label={copy.dither.spark}
              value={spark}
              min={0}
              max={0.6}
              step={0.01}
              display={spark.toFixed(2)}
              onChange={setSpark}
            />
            <Scrub
              label={copy.dither.cell}
              value={pitch}
              min={3}
              max={6}
              step={1}
              display={`${pitch}px`}
              onChange={setPitch}
            />
          </div>
        </div>
      </div>

      <div className="dither-prose" data-reveal>
        <p>{copy.dither.prose}</p>
        <p className="dither-prose__note">{copy.dither.note}</p>
      </div>
    </Chapter>
  )
}

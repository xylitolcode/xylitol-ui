import { useState } from 'react'

import { DitherButton } from '../../src/index'
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
            busyLabel="Copying"
            doneLabel="Copied"
            onAction={() => navigator.clipboard.writeText(COMMAND)}
          >
            Copy install command
          </DitherButton>
        </div>

        <div className="console__bar">
          <div className="dither-scrubs">
            <Scrub
              label="radius"
              value={radius}
              min={24}
              max={120}
              step={1}
              display={`${radius}px`}
              onChange={setRadius}
            />
            <Scrub
              label="spark"
              value={spark}
              min={0}
              max={0.6}
              step={0.01}
              display={spark.toFixed(2)}
              onChange={setSpark}
            />
            <Scrub
              label="cell"
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
        <p>
          Every cell knows one thing: the threshold it answers to, read from a 4×4 Bayer matrix plus
          a hair of jitter so the tile does not settle into a lattice. Coverage above that threshold
          switches the cell on, anything below leaves it dark — which is why the halo arrives in
          rings instead of a blur, and why it holds its shape at any accent colour.
        </p>
        <p className="dither-prose__note">
          Sparks land on four brightness rungs, so nothing in the field is a smooth gradient. The
          ring is drawn from the press point, not from the pointer, and the loop parks itself as
          soon as the last cell decays: an idle button costs no frames.
        </p>
      </div>
    </Chapter>
  )
}

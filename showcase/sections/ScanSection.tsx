import { useState } from 'react'

import { ScanText, type ScanState } from '../../src/index'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

const STATES: readonly { value: ScanState; label: string }[] = [
  { value: 'idle', label: 'idle' },
  { value: 'pending', label: 'pending' },
  { value: 'streaming', label: 'streaming' },
  { value: 'done', label: 'done' },
  { value: 'error', label: 'error' },
]

export function ScanSection() {
  const chapter = getChapter('scan')
  const [state, setState] = useState<ScanState>('streaming')
  const [progress, setProgress] = useState(42)

  const pick = (next: ScanState) => setState(next)

  const scrub = (value: number) => {
    setProgress(value)
    setState('streaming')
  }

  return (
    <Chapter {...chapter}>
      <div className="console" data-reveal>
        <div className="console__stage">
          <ScanText
            state={state}
            progress={state === 'streaming' ? progress / 100 : undefined}
            readout
          >
            Reading 1,284 tokens for collisions
          </ScanText>
        </div>

        <div className="console__bar">
          <div className="console__states" role="group" aria-label="Scan state">
            {STATES.map((entry) => (
              <button
                key={entry.value}
                className="console__state"
                type="button"
                data-active={state === entry.value || undefined}
                onClick={() => pick(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <label className="console__scrub">
            <span className="console__scrub-label">progress</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(event) => scrub(Number(event.target.value))}
            />
            <span className="console__scrub-value">{progress}%</span>
          </label>
        </div>
      </div>

      <div className="scan-prose" data-reveal>
        <ScanText as="p" state="streaming" progress={0.58} angle={18} tail={4}>
          The queue is replaying forty-one events from the last checkpoint, folding each one into
          the snapshot before the writer accepts new work.
        </ScanText>
        <p className="scan-prose__note">
          Wrapped text keeps its own line breaks and letter spacing — the gradient is clipped to
          the glyphs, so nothing is re-laid out. The needle steps aside once the box holds more
          than one line.
        </p>
      </div>
    </Chapter>
  )
}

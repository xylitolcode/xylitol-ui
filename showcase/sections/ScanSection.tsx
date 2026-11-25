import { useState } from 'react'

import { ScanText, type ScanState } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

const STATES: readonly ScanState[] = ['idle', 'pending', 'streaming', 'done', 'error']

export function ScanSection() {
  const chapter = getChapter('scan')
  const { copy } = useI18n()
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
            readoutLabels={copy.scan.readoutLabels}
          >
            {copy.scan.specimen}
          </ScanText>
        </div>

        <div className="console__bar">
          <div className="console__states" role="group" aria-label={copy.scan.stateGroup}>
            {STATES.map((entry) => (
              <button
                key={entry}
                className="console__state"
                type="button"
                data-active={state === entry || undefined}
                onClick={() => pick(entry)}
              >
                {copy.scan.states[entry]}
              </button>
            ))}
          </div>

          <label className="console__scrub">
            <span className="console__scrub-label">{copy.scan.progress}</span>
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
          {copy.scan.prose}
        </ScanText>
        <p className="scan-prose__note">{copy.scan.note}</p>
      </div>
    </Chapter>
  )
}

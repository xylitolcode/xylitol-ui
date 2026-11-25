import { useState } from 'react'

import { MEND_DEFAULTS, MendText, type MendPhase } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

export function MendSection() {
  const chapter = getChapter('mend')
  const { copy } = useI18n()
  const [version, setVersion] = useState(0)
  const [collapse, setCollapse] = useState<number>(MEND_DEFAULTS.collapse)
  const [phase, setPhase] = useState<MendPhase>('settled')
  const [proseVersion, setProseVersion] = useState(0)

  return (
    <Chapter {...chapter}>
      <div className="console" data-reveal>
        <div className="console__stage mend-stage">
          <MendText
            hold={MEND_DEFAULTS.hold}
            collapse={collapse}
            onPhase={setPhase}
            strikeWidth={1}
          >
            {copy.mend.versions[version]}
          </MendText>
        </div>

        <div className="console__bar">
          <div className="console__states" role="group" aria-label={copy.mend.revisionGroup}>
            {copy.mend.versions.map((text, index) => (
              <button
                key={text}
                className="console__state"
                type="button"
                data-active={index === version || undefined}
                onClick={() => setVersion(index)}
              >
                {`v${index + 1}`}
              </button>
            ))}
          </div>

          <label className="console__scrub">
            <span className="console__scrub-label">{copy.mend.collapse}</span>
            <input
              type="range"
              min={200}
              max={900}
              step={20}
              value={collapse}
              onChange={(event) => setCollapse(Number(event.target.value))}
            />
            <span className="console__scrub-value">{`${collapse}ms`}</span>
          </label>

          <span className="mend-phase" data-phase={phase}>
            {copy.mend.phases[phase]}
          </span>
        </div>
      </div>

      <div className="mend-prose" data-reveal>
        <p className="mend-prose__hint">
          <button
            className="mend-prose__cycle"
            type="button"
            onClick={() => setProseVersion((current) => current + 1)}
          >
            {copy.mend.cycle}
          </button>
          <span>{copy.mend.hint}</span>
        </p>

        <MendText as="p" collapse={520}>
          {proseVersion % 2 === 0 ? copy.mend.original : copy.mend.revised}
        </MendText>

        <p className="mend-prose__note">{copy.mend.note}</p>

        <MendText as="p" className="mend-prose__aside">
          {copy.mend.aside}
        </MendText>
      </div>
    </Chapter>
  )
}

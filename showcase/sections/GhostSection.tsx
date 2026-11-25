import { useState } from 'react'

import { GhostPath, readTrace, type GhostPhase } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

import raw from '../traces/rewrite.json'

const zhTrace = readTrace(raw)
const enText =
  'Record a real mouse movement, replay it over the same words, and every pause becomes a step in the tutorial.'
const enTrace = zhTrace ? translateTrace(zhTrace, enText) : null

/** Keep the recorded clock and rhythm, but aim the same path at the English text. */
function translateTrace(trace: NonNullable<typeof zhTrace>, text: string) {
  const samples = trace.samples.map(([t, at, bias, dy, kind]) => {
    // Preserve three visual beats: opening, "replay", and the closing period.
    const mapped =
      at <= 5
        ? at * 3
        : at <= 22
          ? 18 + ((at - 5) / 17) * 17
          : 35 + ((at - 22) / 16) * 72

    return [t, Math.round(mapped), bias, dy, kind] as typeof trace.samples[number]
  })

  return { ...trace, text, samples }
}

function traceFor(locale: 'zh' | 'en') {
  return locale === 'zh' ? zhTrace : enTrace
}

export function GhostSection() {
  const chapter = getChapter('ghost')
  const { locale, copy } = useI18n()
  const [mode, setMode] = useState<'play' | 'step'>('play')
  const [step, setStep] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [phase, setPhase] = useState<GhostPhase>('idle')
  const [active, setActive] = useState(-1)
  const [run, setRun] = useState(0)
  const stops = copy.ghost.steps.length

  const trace = traceFor(locale)
  const text = locale === 'zh' ? (zhTrace?.text ?? '') : enText

  if (!trace) return null

  const restart = () => {
    setMode('play')
    setActive(-1)
    setRun((value) => value + 1)
  }

  return (
    <Chapter {...chapter}>
      <div className="console" data-reveal>
        <div className="console__stage ghost-stage">
          {mode === 'play' ? (
            <GhostPath
              key={`play-${run}`}
              trace={trace}
              speed={speed}
              loop
              onPhase={setPhase}
              onStep={setActive}
            >
              {text}
            </GhostPath>
          ) : (
            <GhostPath
              key={`step-${run}`}
              trace={trace}
              pauseAt={step}
              onPhase={setPhase}
              onStep={setActive}
            >
              {text}
            </GhostPath>
          )}
        </div>

        <div className="console__bar">
          <div className="console__states" role="group" aria-label={copy.ghost.playbackGroup}>
            <button
              className="console__state"
              type="button"
              data-active={mode === 'play' || undefined}
              onClick={restart}
            >
              {copy.ghost.play}
            </button>
            <button
              className="console__state"
              type="button"
              data-active={mode === 'step' || undefined}
              onClick={() => {
                setMode('step')
                setStep(0)
                setRun((value) => value + 1)
              }}
            >
              {copy.ghost.step}
            </button>
            <button
              className="console__state"
              type="button"
              disabled={mode !== 'step'}
              onClick={() => setStep((value) => Math.min(value + 1, stops - 1))}
            >
              {copy.ghost.next}
            </button>
          </div>

          <label className="console__scrub">
            <span className="console__scrub-label">{copy.ghost.speed}</span>
            <input
              type="range"
              min={0.25}
              max={2}
              step={0.25}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <span className="console__scrub-value">{`${speed}×`}</span>
          </label>

          <span className="ghost-phase" data-phase={phase}>
            {copy.ghost.phases[phase]}
          </span>
        </div>
      </div>

      <ol className="ghost-steps" data-reveal>
        {copy.ghost.steps.map((label, index) => (
          <li key={label} data-active={index === active || undefined}>
            <button
              type="button"
              onClick={() => {
                setMode('step')
                setStep(index)
                setRun((value) => value + 1)
              }}
            >
              <span className="ghost-steps__index">{`0${index + 1}`}</span>
              <span className="ghost-steps__label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="ghost-pair" data-reveal>
        <div className="ghost-narrow">
          <GhostPath trace={trace} speed={0.5} loop>
            {text}
          </GhostPath>
        </div>

        <p className="ghost-pair__note">{copy.ghost.pairNote}</p>
      </div>
    </Chapter>
  )
}

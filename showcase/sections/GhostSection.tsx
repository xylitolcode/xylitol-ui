import { useState } from 'react'

import { GhostPath, readTrace, type GhostPhase } from '../../src/index'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

import raw from '../traces/rewrite.json'

const trace = readTrace(raw)
const TEXT = trace?.text ?? ''
const STOPS = trace?.steps.length ?? 0

export function GhostSection() {
  const chapter = getChapter('ghost')
  const [mode, setMode] = useState<'play' | 'step'>('play')
  const [step, setStep] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [phase, setPhase] = useState<GhostPhase>('idle')
  const [active, setActive] = useState(-1)
  const [run, setRun] = useState(0)

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
              {TEXT}
            </GhostPath>
          ) : (
            <GhostPath
              key={`step-${run}`}
              trace={trace}
              pauseAt={step}
              onPhase={setPhase}
              onStep={setActive}
            >
              {TEXT}
            </GhostPath>
          )}
        </div>

        <div className="console__bar">
          <div className="console__states" role="group" aria-label="Playback">
            <button
              className="console__state"
              type="button"
              data-active={mode === 'play' || undefined}
              onClick={restart}
            >
              play
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
              step
            </button>
            <button
              className="console__state"
              type="button"
              disabled={mode !== 'step'}
              onClick={() => setStep((value) => Math.min(value + 1, STOPS - 1))}
            >
              next →
            </button>
          </div>

          <label className="console__scrub">
            <span className="console__scrub-label">speed</span>
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
            {phase}
          </span>
        </div>
      </div>

      <ol className="ghost-steps" data-reveal>
        {trace.steps.map((label, index) => (
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
            {TEXT}
          </GhostPath>
        </div>

        <p className="ghost-pair__note">
          同一份 trace，260px 宽，断行位置完全不同。落点仍然贴着那些字——因为存的不是像素，
          是「第几个字 + 字内偏移」。窗口缩放、换字体、滚动，都不需要重新录。
          轨迹在换行处断开，不会斜穿两行。
        </p>
      </div>
    </Chapter>
  )
}

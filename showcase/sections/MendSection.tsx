import { useState } from 'react'

import { MEND_DEFAULTS, MendText, type MendPhase } from '../../src/index'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

const VERSIONS = [
  '这个方案的成本有点高，先把缓存层砍掉再说。',
  '这个方案的代价有点低，先把缓存层留着再说。',
  '这个代价其实不低，只是缓存层的写入放大了它。',
  '这个代价其实不算低，问题是缓存层的写入把它放大了三倍。',
] as const

const PROSE = [
  'MendText 认的是同一句话里的改动，不是两份文档的对照。把新文案交给它，它自己找出接缝：走的字塌成一条线，来的字从同一条缝里长出来。',
  '这也是它和 ScanText 的区别——ScanText 说的是「读到哪里」，MendText 说的是「刚才那句变成了什么」。',
] as const

export function MendSection() {
  const chapter = getChapter('mend')
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
            {VERSIONS[version]}
          </MendText>
        </div>

        <div className="console__bar">
          <div className="console__states" role="group" aria-label="Revision">
            {VERSIONS.map((text, index) => (
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
            <span className="console__scrub-label">collapse</span>
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
            {phase}
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
            再改一版
          </button>
          <span>点一下，看它在正文里换掉一个从句</span>
        </p>

        <MendText as="p" collapse={520}>
          {proseVersion % 2 === 0 ? PROSE[0] : PROSE[0].replace('不是两份文档的对照', '而是改稿前后的同一处')}
        </MendText>

        <p className="mend-prose__note">
          正文字号、行高、字间距都还是正文的：保留的字一直是纯 inline，行是由被删那一段的宽度收拢
          带过去的，所以没有跳位，也不需要 FLIP。代价是一条纪律——被改的那一段必须落在同一行内。
          跨行的段落，换掉的字直接退场，不做宽度动画，否则它会重排成一列一个字。
        </p>

        <MendText as="p" className="mend-prose__aside">
          {PROSE[1]}
        </MendText>
      </div>
    </Chapter>
  )
}

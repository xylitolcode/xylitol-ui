import { useState } from 'react'

import { DirectionAwareSelection, SelectionTarget } from '../../src/index'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'
import { AvatarIcon, BoltIcon, CubeIcon } from '../ui/icons'

const FACTS = [
  { value: '4', label: 'sweep directions, picked from the edge you entered' },
  { value: '60 ms', label: 'stagger between the four corner handles' },
  { value: '1 spring', label: 'carries the frame between words instead of a jump' },
]

export function SelectionSection() {
  const chapter = getChapter('selection')
  const [pinned, setPinned] = useState<string | null>(null)

  return (
    <Chapter {...chapter}>
      <div className="sentence" data-reveal>
        <DirectionAwareSelection color="#3074FE" bounce={0.15} handleFill="#070811" showSize={false}>
          <p className="sentence__text">
            Hi, I&apos;m{' '}
            <SelectionTarget
              words="XYLI TOL"
              icon={<AvatarIcon />}
              href="https://github.com/xylitolcode"
              hint="hover here"
              selected={pinned === 'name'}
              onSelect={() => setPinned(pinned === 'name' ? null : 'name')}
            />
            . I build{' '}
            <SelectionTarget
              words="Effects Kit"
              icon={<CubeIcon />}
              href="https://github.com/xylitolcode"
              selected={pinned === 'kit'}
              onSelect={() => setPinned(pinned === 'kit' ? null : 'kit')}
            />{' '}
            for developers and{' '}
            <SelectionTarget
              words="motion studies"
              icon={<BoltIcon />}
              href="https://github.com/xylitolcode"
              selected={pinned === 'motion'}
              onSelect={() => setPinned(pinned === 'motion' ? null : 'motion')}
            />{' '}
            for designers.
          </p>
        </DirectionAwareSelection>
      </div>

      <p className="sentence__note" data-reveal>
        Click a target to pin the frame over the whole phrase; click again to release it. The
        paragraphs above and below keep their line height while the frame moves.
      </p>

      <dl className="facts" data-reveal>
        {FACTS.map((fact) => (
          <div className="fact" key={fact.value}>
            <dt className="fact__value">{fact.value}</dt>
            <dd className="fact__label">{fact.label}</dd>
          </div>
        ))}
      </dl>
    </Chapter>
  )
}

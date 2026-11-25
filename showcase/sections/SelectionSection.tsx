import { useState } from 'react'

import { DirectionAwareSelection, SelectionTarget } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'
import { AvatarIcon, BoltIcon, CubeIcon } from '../ui/icons'

export function SelectionSection() {
  const chapter = getChapter('selection')
  const { copy } = useI18n()
  const [pinned, setPinned] = useState<string | null>(null)

  return (
    <Chapter {...chapter}>
      <div className="sentence" data-reveal>
        <DirectionAwareSelection color="#3074FE" bounce={0.15} handleFill="#070811" showSize={false}>
          <p className="sentence__text">
            {copy.selection.beforeName}
            <SelectionTarget
              words={copy.selection.nameWord}
              icon={<AvatarIcon />}
              href="https://github.com/xylitolcode/xylitol-ui"
              hint={copy.selection.nameHint}
              selected={pinned === 'name'}
              onSelect={() => setPinned(pinned === 'name' ? null : 'name')}
            />
            {copy.selection.afterName}
            <SelectionTarget
              words={copy.selection.kitWord}
              icon={<CubeIcon />}
              href="https://github.com/xylitolcode/xylitol-ui"
              selected={pinned === 'kit'}
              onSelect={() => setPinned(pinned === 'kit' ? null : 'kit')}
            />
            {copy.selection.afterKit}
            <SelectionTarget
              words={copy.selection.motionWord}
              icon={<BoltIcon />}
              href="https://github.com/xylitolcode/xylitol-ui"
              selected={pinned === 'motion'}
              onSelect={() => setPinned(pinned === 'motion' ? null : 'motion')}
            />
            {copy.selection.afterMotion}
          </p>
        </DirectionAwareSelection>
      </div>

      <p className="sentence__note" data-reveal>{copy.selection.note}</p>

      <dl className="facts" data-reveal>
        {copy.selection.facts.map((fact) => (
          <div className="fact" key={fact.value}>
            <dt className="fact__value">{fact.value}</dt>
            <dd className="fact__label">{fact.label}</dd>
          </div>
        ))}
      </dl>
    </Chapter>
  )
}

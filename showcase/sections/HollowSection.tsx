import { HollowFlowText } from '../../src/index'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

const SPECIMENS = [
  {
    key: 'cobalt',
    word: 'COBALT',
    caption: 'cool stops',
    colors: ['#22d3ee', '#3b82f6', '#6366f1', '#a78bfa'],
  },
  {
    key: 'ember',
    word: 'EMBER',
    caption: 'warm stops',
    colors: ['#fb923c', '#f97316', '#facc15', '#fb7185'],
  },
] as const

export function HollowSection() {
  const chapter = getChapter('hollow')

  return (
    <Chapter {...chapter}>
      <div className="stage stage--flow" data-reveal>
        <HollowFlowText ariaLabel="Flowing" fontSize={196} fontWeight={800}>
          FLOWING
        </HollowFlowText>
        <p className="stage__caption">
          Default palette · six stops · nine-second loop · fill appears inside a 145-unit radius
        </p>
      </div>

      <div className="specimens">
        {SPECIMENS.map((specimen) => (
          <figure className="specimen" key={specimen.key} data-reveal>
            <div className="specimen__stage">
              <HollowFlowText
                ariaLabel={specimen.word}
                colors={specimen.colors}
                fontSize={170}
                fontWeight={800}
              >
                {specimen.word}
              </HollowFlowText>
            </div>
            <figcaption className="specimen__caption">
              {specimen.caption} · <code>colors</code>
            </figcaption>
          </figure>
        ))}
      </div>
    </Chapter>
  )
}

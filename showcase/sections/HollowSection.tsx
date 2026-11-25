import { HollowFlowText } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

const SPECIMENS = {
  cobalt: ['#22d3ee', '#3b82f6', '#6366f1', '#a78bfa'],
  ember: ['#fb923c', '#f97316', '#facc15', '#fb7185'],
} as const

export function HollowSection() {
  const chapter = getChapter('hollow')
  const { copy } = useI18n()

  return (
    <Chapter {...chapter}>
      <div className="stage stage--flow" data-reveal>
        <HollowFlowText ariaLabel={copy.hollow.flowingAria} fontSize={196} fontWeight={800}>
          {copy.hollow.flowingWord}
        </HollowFlowText>
        <p className="stage__caption">{copy.hollow.stageCaption}</p>
      </div>

      <div className="specimens">
        {(Object.keys(SPECIMENS) as Array<keyof typeof SPECIMENS>).map((key) => {
          const specimen = copy.hollow.specimens[key]

          return (
            <figure className="specimen" key={key} data-reveal>
              <div className="specimen__stage">
                <HollowFlowText
                  ariaLabel={specimen.word}
                  colors={SPECIMENS[key]}
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
          )
        })}
      </div>
    </Chapter>
  )
}

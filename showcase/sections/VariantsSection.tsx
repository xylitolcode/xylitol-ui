import { DirectionAwareSelection, SelectionTarget } from '../../src/index'
import { useI18n } from '../i18n'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

export function VariantsSection() {
  const chapter = getChapter('variants')
  const { copy } = useI18n()

  return (
    <Chapter {...chapter}>
      <DirectionAwareSelection handleFill="#070811">
        <div className="variants">
          <div className="variant" data-reveal>
            <div className="variant__stage">
              <SelectionTarget words={copy.variants.solidWord} />
            </div>
            <p className="variant__prop">
              <code>{copy.variants.solidCode}</code> {copy.variants.solidText}
            </p>
          </div>

          <div className="variant" data-reveal>
            <div className="variant__stage">
              <SelectionTarget
                words={copy.variants.outlineWord}
                fillColor="transparent"
                fillTextColor="inherit"
              />
            </div>
            <p className="variant__prop">
              <code>{copy.variants.outlineCode}</code> {copy.variants.outlineText}
            </p>
          </div>

          <div className="variant" data-reveal>
            <div className="variant__stage">
              <SelectionTarget words={copy.variants.pinnedWord} selected />
            </div>
            <p className="variant__prop">
              <code>{copy.variants.pinnedCode}</code> {copy.variants.pinnedText}
            </p>
          </div>
        </div>
      </DirectionAwareSelection>
    </Chapter>
  )
}

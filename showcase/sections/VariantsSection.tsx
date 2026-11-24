import { DirectionAwareSelection, SelectionTarget } from '../../src/index'
import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'

export function VariantsSection() {
  const chapter = getChapter('variants')

  return (
    <Chapter {...chapter}>
      <DirectionAwareSelection handleFill="#070811">
        <div className="variants">
          <div className="variant" data-reveal>
            <div className="variant__stage">
              <SelectionTarget words="solid" />
            </div>
            <p className="variant__prop">
              <code>fillColor</code> inherits the accent
            </p>
          </div>

          <div className="variant" data-reveal>
            <div className="variant__stage">
              <SelectionTarget
                words="outline"
                fillColor="transparent"
                fillTextColor="inherit"
              />
            </div>
            <p className="variant__prop">
              <code>fillColor=&quot;transparent&quot;</code> leaves the letters alone
            </p>
          </div>

          <div className="variant" data-reveal>
            <div className="variant__stage">
              <SelectionTarget words="pinned" selected />
            </div>
            <p className="variant__prop">
              <code>selected</code> keeps the box open
            </p>
          </div>
        </div>
      </DirectionAwareSelection>
    </Chapter>
  )
}

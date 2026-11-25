import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import type { ChapterEntry, ChapterSlug } from '../registry'

interface ChapterProps extends ChapterEntry {
  children: ReactNode
}

/** One chapter of the scroll: label, title, lede, then whatever proof it needs. */
export function Chapter({ slug, index, children }: ChapterProps) {
  const { copy } = useI18n()
  const chapter = copy.chapters[slug as ChapterSlug]
  const name = copy.chapterNames[slug as ChapterSlug]

  return (
    <section className="chapter" id={slug} aria-labelledby={`${slug}-title`}>
      <div className="shell">
        <header className="chapter__head" data-reveal>
          <p className="chapter__label">
            <span className="chapter__index">{index}</span>
            <span className="chapter__divider" aria-hidden="true" />
            <span className="chapter__name">{name}</span>
          </p>
          <h2 className="chapter__title" id={`${slug}-title`}>
            {chapter.title}
          </h2>
          <p className="chapter__lede">{chapter.lede}</p>
        </header>
        {children}
      </div>
    </section>
  )
}

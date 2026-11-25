export interface ChapterEntry {
  slug: string
  index: string
}

/**
 * The page is one scroll, a chapter per component. Everything else — the rail,
 * the section headers, the order on screen — is derived from this list, so
 * adding a chapter never means touching four different files.
 */
export const CHAPTERS = [
  {
    slug: 'hollow',
    index: '01',
  },
  {
    slug: 'selection',
    index: '02',
  },
  {
    slug: 'scan',
    index: '03',
  },
  {
    slug: 'dither',
    index: '04',
  },
  {
    slug: 'mend',
    index: '05',
  },
  {
    slug: 'ghost',
    index: '06',
  },
  {
    slug: 'variants',
    index: '07',
  },
  {
    slug: 'install',
    index: '08',
  },
] as const satisfies readonly ChapterEntry[]

export type ChapterSlug = (typeof CHAPTERS)[number]['slug']

export const CHAPTER_SLUGS = CHAPTERS.map((chapter) => chapter.slug)

export function getChapter(slug: ChapterSlug): ChapterEntry {
  const chapter = CHAPTERS.find((entry) => entry.slug === slug)
  if (!chapter) throw new Error(`Unknown chapter: ${slug}`)
  return chapter
}

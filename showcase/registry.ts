export interface ChapterEntry {
  slug: string
  index: string
  name: string
  title: string
  lede: string
}

/**
 * The page is one scroll, four chapters. Everything else — the rail, the section
 * headers, the order on screen — is derived from this list, so adding a chapter
 * never means touching four different files.
 */
export const CHAPTERS = [
  {
    slug: 'hollow',
    index: '01',
    name: 'HollowFlowText',
    title: 'Outline that breathes.',
    lede: 'A six-stop gradient loops along the outline while a thinner highlight travels with it. Nothing is filled in — until your pointer gets close, and a soft radial reveal blooms under the cursor, keeping a little momentum when you stop.',
  },
  {
    slug: 'selection',
    index: '02',
    name: 'DirectionAwareSelection',
    title: 'The frame remembers which side you came from.',
    lede: 'Every word is its own target. Come at it from the left and the accent sweeps in from the left; approach from below and it rises. Four corner handles snap out 60 ms apart, and the frame springs between words instead of teleporting.',
  },
  {
    slug: 'variants',
    index: '03',
    name: 'Props',
    title: 'Same frame, three moods.',
    lede: 'The fill is a prop, not a baked-in decision. Keep it solid, stop at the bare outline, or pin a target open so the box stays where it is. Hover any of the three to bring the frame in.',
  },
  {
    slug: 'install',
    index: '04',
    name: 'Install',
    title: 'Two components, one stylesheet.',
    lede: 'Zero runtime dependencies. Drop it into a paragraph and the text keeps flowing like text — no wrappers, no layout shifts, no reset.',
  },
] as const satisfies readonly ChapterEntry[]

export type ChapterSlug = (typeof CHAPTERS)[number]['slug']

export const CHAPTER_SLUGS = CHAPTERS.map((chapter) => chapter.slug)

export function getChapter(slug: ChapterSlug): ChapterEntry {
  const chapter = CHAPTERS.find((entry) => entry.slug === slug)
  if (!chapter) throw new Error(`Unknown chapter: ${slug}`)
  return chapter
}

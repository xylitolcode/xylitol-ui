export interface ChapterEntry {
  slug: string
  index: string
  name: string
  title: string
  lede: string
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
    slug: 'scan',
    index: '03',
    name: 'ScanText',
    title: 'The sentence is the progress bar.',
    lede: 'A read head travels the line. Everything behind it keeps full ink, everything ahead stays a ghost, and the hot edge cools back to ink along a trail whose length follows its speed. Hand it a progress value and the sentence reports itself; leave the value out and it loops while something thinks.',
  },
  {
    slug: 'dither',
    index: '04',
    name: 'DitherButton',
    title: 'The halo is a halftone, not a haze.',
    lede: 'A pill whose surface is a grid of cells and whose light is a 4×4 Bayer matrix. Move across it and the glow arrives as rings of dots that switch on at exact thresholds; press it and a ring travels outward, picking cells off as it passes. Sparks land on four brightness rungs, so nothing in the field is a smooth gradient.',
  },
  {
    slug: 'mend',
    index: '05',
    name: 'MendText',
    title: 'The edit reports itself.',
    lede: 'Hand it a new string and it finds the seam on its own: the words that left squeeze into a struck line, the words that arrived grow out of the same gap. A swap crosses over inside one width instead of showing both sentences side by side, so a revision never turns into a redline.',
  },
  {
    slug: 'ghost',
    index: '06',
    name: 'GhostPath',
    title: 'The tutorial is a recording, not a screenshot.',
    lede: 'A pointer path is stored as character offsets rather than pixels, then replayed on the paragraph: the trail follows the words, widens with speed, and stops breathing at each hold. Narrow the window and it still lands on the same characters — because the recording remembers which word it was pointing at.',
  },
  {
    slug: 'variants',
    index: '07',
    name: 'Props',
    title: 'Same frame, three moods.',
    lede: 'The fill is a prop, not a baked-in decision. Keep it solid, stop at the bare outline, or pin a target open so the box stays where it is. Hover any of the three to bring the frame in.',
  },
  {
    slug: 'install',
    index: '08',
    name: 'Install',
    title: 'Six components, one stylesheet.',
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

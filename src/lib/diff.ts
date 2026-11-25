/**
 * A character-level diff built for animation, not for reporting.
 *
 * MendText re-runs this on every rewrite, so it works on a paragraph rather
 * than a file: the shared head and tail are trimmed first, what is left goes
 * through a plain LCS, and an oversized middle collapses into one removal plus
 * one insertion instead of a million cells.
 *
 * Characters are the units, because they are stable: a word-unit tokenizer
 * changes its splits whenever the text around it moves (`a🙂b → ab` loses its
 * boundaries entirely), and a diff that reshapes itself under the edit is
 * worse than no diff at all.
 *
 * But a raw character LCS is scattered. It will happily keep a stray `r` and
 * report `brown → red` as `b / r / own / ed`, four hunks where the eye expects
 * one word swapped. So a second pass absorbs those scraps: a keep run of one
 * or two Latin characters wedged between two changed runs is folded into them,
 * and the block is emitted as one removal then one insertion. Han is exempt —
 * every Han character carries meaning, so `开发` is real text, not a scrap.
 *
 * Every run carries two offsets. The animation measures rects on the old text
 * and has to know which run in the new text those rects became; the offsets
 * are what makes that translation possible without touching the DOM twice.
 *
 * Units are code points, so a surrogate pair is never split into two lone
 * halves, and runs report UTF-16 offsets because that is what
 * `String.prototype.slice` eats.
 */

export type DiffKind = 'keep' | 'gone' | 'new'

export interface DiffRun {
  kind: DiffKind
  /** The text this run covers. Never empty. */
  text: string
  /**
   * UTF-16 offset in the next text where the run starts. A `gone` run reports
   * the seam it was cut from — the offset it would have had if it stayed —
   * even though it holds no characters there.
   */
  at: number
  /**
   * UTF-16 offset in the previous text where the run starts. A `new` run
   * reports the seam it arrived at, before any of its own characters.
   */
  prevAt: number
}

export interface DiffOptions {
  /**
   * Budget for the LCS table, counted in cells (`n × m`) of code points. Past
   * it, saying "these characters left, those character arrived" is cheaper
   * than aligning them.
   */
  maxCells?: number
  /**
   * Longest keep run, in code points, that may be absorbed into a change
   * block. 0 disables the pass and leaves a raw character diff.
   */
  absorb?: number
}

export const DIFF_LIMITS = {
  maxCells: 160_000,
  absorb: 2,
} as const

const HAN = /\p{Script=Han}/u
const LATIN = /[A-Za-z0-9]/
const SPACE = /\s/

interface DiffOp {
  kind: DiffKind
  text: string
}

/**
 * Diff `prev` into `next` as a flat list of runs in reading order: keeps carry
 * over, removals and insertions sit at the seam they happened.
 *
 * `keep + gone` in order reconstructs `prev`, `keep + new` reconstructs `next`.
 */
export function diffRuns(
  prev: string,
  next: string,
  options: DiffOptions = {},
): DiffRun[] {
  if (prev === next) {
    return next.length > 0 ? [{ kind: 'keep', text: next, at: 0, prevAt: 0 }] : []
  }

  const a = Array.from(prev)
  const b = Array.from(next)

  if (a.length === 0) return [{ kind: 'new', text: next, at: 0, prevAt: 0 }]
  if (b.length === 0) return [{ kind: 'gone', text: prev, at: 0, prevAt: 0 }]

  const maxCells = options.maxCells ?? DIFF_LIMITS.maxCells
  const absorb = options.absorb ?? DIFF_LIMITS.absorb

  const headLimit = Math.min(a.length, b.length)
  let head = 0
  while (head < headLimit && a[head] === b[head]) head += 1

  // The tail may not reach into the head, otherwise "abc" → "abcabc" would
  // claim the same characters on both sides.
  const tailLimit = headLimit - head
  let tail = 0
  while (tail < tailLimit && a[a.length - 1 - tail] === b[b.length - 1 - tail]) {
    tail += 1
  }

  const ops: DiffOp[] = []

  for (let k = 0; k < head; k += 1) ops.push({ kind: 'keep', text: a[k] })
  alignMiddle(a.slice(head, a.length - tail), b.slice(head, b.length - tail), maxCells, ops)
  for (let k = a.length - tail; k < a.length; k += 1) {
    ops.push({ kind: 'keep', text: a[k] })
  }

  const runs = toRuns(ops)
  return absorb > 0 ? mergeScraps(runs, absorb) : runs
}

/**
 * LCS of two unit lists. The table is a suffix table: `table[i][j]` holds the
 * length of the longest common subsequence of `midA[i..]` and `midB[j..]`,
 * which lets the walk forward make its decision from one lookup.
 */
function alignMiddle(
  midA: string[],
  midB: string[],
  maxCells: number,
  ops: DiffOp[],
) {
  const n = midA.length
  const m = midB.length

  if (n === 0 && m === 0) return

  if (n * m > maxCells) {
    for (const unit of midA) ops.push({ kind: 'gone', text: unit })
    for (const unit of midB) ops.push({ kind: 'new', text: unit })
    return
  }

  const width = m + 1
  const table = new Uint32Array((n + 1) * width)

  for (let i = n - 1; i >= 0; i -= 1) {
    const row = i * width
    const below = row + width
    for (let j = m - 1; j >= 0; j -= 1) {
      table[row + j] =
        midA[i] === midB[j]
          ? table[below + j + 1] + 1
          : Math.max(table[below + j], table[row + j + 1])
    }
  }

  let i = 0
  let j = 0

  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      ops.push({ kind: 'keep', text: midA[i] })
      i += 1
      j += 1
      continue
    }

    // Ties prefer dropping from the previous text, so an equal-length edit
    // reads as "old word left, new word arrived" rather than the reverse.
    if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      ops.push({ kind: 'gone', text: midA[i] })
      i += 1
    } else {
      ops.push({ kind: 'new', text: midB[j] })
      j += 1
    }
  }

  while (i < n) {
    ops.push({ kind: 'gone', text: midA[i] })
    i += 1
  }
  while (j < m) {
    ops.push({ kind: 'new', text: midB[j] })
    j += 1
  }
}

/** A keep run too short and too Latin to be worth its own hunk. */
function isScrap(run: DiffOp, absorb: number) {
  return (
    run.kind === 'keep' &&
    run.text.length <= absorb &&
    LATIN.test(run.text) &&
    !HAN.test(run.text) &&
    !SPACE.test(run.text)
  )
}

/**
 * Fold change blocks together: every scrap keep wedged between two changed
 * runs joins the block, and the block is re-emitted as removal-then-insertion.
 * Absorbed characters are still accounted for on both sides — the block's old
 * span is `gone + kept`, its new span is `new + kept` — so the two
 * reconstructions stay exact.
 */
function mergeScraps(runs: DiffRun[], absorb: number): DiffRun[] {
  const merged: DiffOp[] = []
  let block: DiffOp[] = []

  const flush = () => {
    if (block.length === 0) return

    // A scrap at the tail has no change after it, so it stays outside.
    const tail: DiffOp[] = []
    while (block.length > 0 && isScrap(block[block.length - 1], absorb)) {
      tail.unshift(block.pop() as DiffOp)
    }

    const oldSpan = block
      .filter((op) => op.kind !== 'new')
      .map((op) => op.text)
      .join('')
    const newSpan = block
      .filter((op) => op.kind !== 'gone')
      .map((op) => op.text)
      .join('')

    if (oldSpan.length > 0) merged.push({ kind: 'gone', text: oldSpan })
    if (newSpan.length > 0) merged.push({ kind: 'new', text: newSpan })

    for (const op of tail) merged.push(op)
    block = []
  }

  for (const run of runs) {
    if (run.kind !== 'keep') {
      block.push({ kind: run.kind, text: run.text })
      continue
    }

    // A scrap only joins a block that already contains a change. Leading
    // scraps belong to the text, not to the edit: absorbing them turns
    // `a🙂b → a🙃b` into "a🙂 left, a🙃 arrived" instead of "🙂 left, 🙃 arrived".
    const changed = block.some((op) => op.kind !== 'keep')
    if (changed && isScrap(run, absorb)) {
      block.push({ kind: 'keep', text: run.text })
      continue
    }

    flush()
    merged.push({ kind: 'keep', text: run.text })
  }

  flush()

  return toRuns(merged)
}

/**
 * Walk the ops once, merging neighbours of the same kind and handing every run
 * the two offsets it starts at.
 */
function toRuns(ops: DiffOp[]): DiffRun[] {
  const runs: DiffRun[] = []
  let at = 0
  let prevAt = 0

  for (const op of ops) {
    const last = runs[runs.length - 1]

    if (last && last.kind === op.kind) {
      last.text += op.text
    } else {
      runs.push({ kind: op.kind, text: op.text, at, prevAt })
    }

    if (op.kind !== 'new') prevAt += op.text.length
    if (op.kind !== 'gone') at += op.text.length
  }

  return runs
}

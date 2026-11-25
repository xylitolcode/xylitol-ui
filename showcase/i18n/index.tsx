import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Locale = 'zh' | 'en'

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T

const zh = {
  meta: {
    title: 'XYLITOL Effects — 会回应你的文字',
    description:
      'XYLITOL Effects：React 文字与动效组件——在光标下显现的流动轮廓、方向感知选择框、沿句子扫描的读头、改写后自行弥合的文字，以及可回放的指针轨迹。',
  },
  shell: {
    brandSuffix: '效果',
    projectLinks: '项目链接',
    chapters: '章节',
    footerLinks: '页脚链接',
    backToTop: '回到顶部',
    language: '语言',
    copy: '复制',
    copied: '已复制',
  },
  chapterNames: {
    hollow: 'HollowFlowText',
    selection: 'DirectionAwareSelection',
    scan: 'ScanText',
    dither: 'DitherButton',
    mend: 'MendText',
    ghost: 'GhostPath',
    variants: '属性',
    install: '安装',
  },
  hero: {
    wordmark: '你好 XYLITOL',
    wordmarkAria: '你好 XYLITOL',
    lede: '五种文字效果，外加一个会回应你的按钮：只在光标下显形的流动轮廓、知道你从哪条边靠近的选择框、沿句子移动的读头、改写后自行弥合的文字、用半调网点亮起的胶囊，以及能把指针轨迹重放到字上的录像。',
    cue: '向下滚动——下面的每个效果都能亲手试',
  },
  chapters: {
    hollow: {
      title: '会呼吸的轮廓。',
      lede: '六段渐变色沿轮廓循环，一道更细的高光跟着它走。文字始终是空心的——直到指针靠近，柔和的径向揭示在光标下展开，停住时还会带着一点惯性。',
    },
    selection: {
      title: '选框记得你从哪一边靠近。',
      lede: '每个词都是独立目标。从左边靠近，强调色就从左边扫入；从下方进入，它就从下往上升。四个角柄相隔 60 ms 弹出，选框在词与词之间弹性移动，而不是瞬移。',
    },
    scan: {
      title: '句子本身就是进度条。',
      lede: '读头沿句子移动。它身后的文字保持完整墨色，前方的文字留在虚影里，滚烫的边缘沿一条随速度伸缩的拖尾冷却回墨色。给它一个进度值，句子自己报告进展；不传进度，它就在思考时循环。',
    },
    dither: {
      title: '光晕是半调网点，不是一团雾。',
      lede: '胶囊表面是一片网格，光由 4×4 Bayer 矩阵决定。指针扫过时，光晕以一圈圈点位出现，按精确阈值亮起；按下后，一圈波纹向外走，掠过时逐个点亮网格。火花落在四档亮度上，因此这里没有平滑渐变。',
    },
    mend: {
      title: '改写会自己报告。',
      lede: '给 MendText 一个新字符串，它会自己找到接缝：离开的词收拢成一条删除线，到来的词从同一道缝里长出来。替换在同一个宽度内交叉完成，而不是把两句并排展示，所以一次改稿不会变成红笔校样。',
    },
    ghost: {
      title: '教程是录下来的，不是截出来的。',
      lede: '指针轨迹按字符偏移保存，而不是像素，然后在段落上回放：轨迹贴着文字走，随速度变宽，在每次停顿处屏住呼吸。窗口变窄，它仍落在同一批字上——因为录像记的是它当时指着哪个词。',
    },
    variants: {
      title: '同一个选框，三种状态。',
      lede: '填充颜色是 prop，不是写死的决定。保持实心、只留轮廓，或者把目标固定为打开状态。悬停任意一个，选框就会靠近。',
    },
    install: {
      title: '六个组件，一份样式表。',
      lede: '零运行时依赖。放进段落，文字仍然像文字一样自然流动——没有包裹层，没有布局跳动，也没有重置。',
    },
  },
  hollow: {
    flowingWord: 'FLOWING',
    flowingAria: '流动',
    stageCaption: '默认色板 · 六个节点 · 九秒循环 · 指针 145 单位半径内出现填充',
    specimens: {
      cobalt: { word: 'COBALT', caption: '冷色节点' },
      ember: { word: 'EMBER', caption: '暖色节点' },
    },
  },
  selection: {
    beforeName: '你好，我是 ',
    afterName: '。我为开发者做',
    afterKit: '，也为设计师做',
    afterMotion: '。',
    nameWord: 'XYLI TOL',
    nameHint: '移到这里',
    kitWord: '效果组件',
    motionWord: '动效研究',
    note: '点一下目标，可以把选框固定在整段短语上；再点一次就松开。选框移动时，它上下方的段落仍保持原来的行高。',
    facts: [
      { value: '4', label: '个扫入方向，由你进入目标的那条边决定' },
      { value: '60 ms', label: '四个角柄依次弹出的间隔' },
      { value: '1 个弹簧', label: '负责把选框带到下一个词，而不是让它跳过去' },
    ],
  },
  scan: {
    stateGroup: '扫描状态',
    states: {
      idle: '空闲',
      pending: '等待',
      streaming: '扫描中',
      done: '完成',
      error: '错误',
    },
    progress: '进度',
    readoutLabels: {
      idle: '空闲',
      scanning: '扫描中',
      done: '完成',
      error: '错误',
    },
    specimen: '正在为 1,284 个 token 检查碰撞',
    prose: '队列正在回放上一个检查点之后的四十一条事件，并逐条折进快照，之后写入器才会接受新的工作。',
    note: '换行后的文字仍保留自己的断行与字间距——渐变被裁进字形里，所以不会重新排版。当文本盒超过一行时，细针会自动退场。',
  },
  dither: {
    button: '复制安装命令',
    busy: '复制中',
    done: '已复制',
    radius: '半径',
    spark: '火花',
    cell: '单元格',
    prose:
      '每个单元格只认得一件事：它回应哪一档阈值。阈值来自 4×4 Bayer 矩阵，再加一丝抖动，免得整片网格落成规整的格点。覆盖度越过阈值，单元就点亮；低于阈值便保持暗着——所以光晕是一圈圈来的，而不是一团模糊，也能在任意强调色下保持形状。',
    note: '火花只落在四档亮度上，所以这片场里没有平滑渐变。波纹从按下点画开，而不是从指针画开；最后一格衰减完成，循环立即停下：空闲按钮不消耗任何帧。',
  },
  mend: {
    versions: [
      '这个方案的成本有点高，先把缓存层砍掉再说。',
      '这个方案的代价有点低，先把缓存层留着再说。',
      '这个代价其实不低，只是缓存层的写入放大了它。',
      '这个代价其实不算低，问题是缓存层的写入把它放大了三倍。',
    ],
    original:
      'MendText 认的是同一句话里的改动，不是两份文档的对照。把新文案交给它，它自己找出接缝：走的字塌成一条线，来的字从同一条缝里长出来。',
    revised:
      'MendText 认的是同一句话里的改动，也是改稿前后的同一处。把新文案交给它，它自己找出接缝：走的字塌成一条线，来的字从同一条缝里长出来。',
    aside:
      '这也是它和 ScanText 的区别——ScanText 说的是「读到哪里」，MendText 说的是「刚才那句变成了什么」。',
    cycle: '再改一版',
    hint: '点一下，看它在正文里换掉一个从句',
    note: '正文字号、行高、字间距都还是正文的：保留的字一直是纯 inline，行是由被删那一段的宽度收拢带过去的，所以没有跳位，也不需要 FLIP。代价是一条纪律——被改的那一段必须落在同一行内。跨行的段落，换掉的字直接退场，不做宽度动画，否则它会重排成一列一个字。',
    collapse: '收拢时长',
    revisionGroup: '修订版本',
    phases: {
      settled: '已稳定',
      rewriting: '改写中',
      erasing: '收拢中',
    },
  },
  ghost: {
    playbackGroup: '回放控制',
    play: '播放',
    step: '逐帧',
    next: '下一步 →',
    speed: '速度',
    steps: [
      '从段首落下，指针贴着字走',
      '停在「回放」上：整句的重心在这里',
      '最后一停落在句号后面，收手',
    ],
    phases: {
      idle: '待机',
      playing: '播放中',
      holding: '停顿',
      ended: '结束',
    },
    pairNote:
      '同一份 trace，260px 宽，断行位置完全不同。落点仍然贴着那些字——因为存的不是像素，而是「第几个字 + 字内偏移」。窗口缩放、换字体、滚动，都不需要重新录。轨迹在换行处断开，不会斜穿两行。',
  },
  variants: {
    solidWord: '实心',
    outlineWord: '轮廓',
    pinnedWord: '固定',
    solidCode: 'fillColor',
    solidText: '继承强调色',
    outlineCode: 'fillColor="transparent"',
    outlineText: '让文字保持原样',
    pinnedCode: 'selected',
    pinnedText: '让选框保持打开',
  },
  install: {
    snippet: `import { DirectionAwareSelection, SelectionTarget } from '@xylitol0520/ui'
import '@xylitol0520/ui/style.css'

export function Intro() {
  return (
    <DirectionAwareSelection color="#3074FE" fillColor="transparent">
      <p>
        从任意方向靠近 <SelectionTarget words="这个词" hint="试试看" />。
      </p>
    </DirectionAwareSelection>
  )
}`,
    notes: [
      '零运行时依赖',
      '自带 TypeScript 类型',
      '遵守 prefers-reduced-motion',
      '键盘焦点会画出同一个选框',
    ],
    noteBefore:
      '样式按需引入：在应用入口导入一次样式表即可。其余行为都由 prop 控制；一个既没有 ',
    noteBetween: ' 也没有 ',
    noteAfter: ' 的目标，会保持为不可交互的纯文本。',
  },
} as const

type Copy = Widen<typeof zh>

const en: Copy = {
  meta: {
    title: 'XYLITOL Effects — text that answers back',
    description:
      'XYLITOL Effects: React text effects — a hollow outline that fills under your cursor, a direction-aware selection frame, a read head that scans the line, text that mends after an edit, and a pointer trace you can replay.',
  },
  shell: {
    brandSuffix: 'Effects',
    projectLinks: 'Project links',
    chapters: 'Chapters',
    footerLinks: 'Footer links',
    backToTop: 'Back to top',
    language: 'Language',
    copy: 'Copy',
    copied: 'Copied',
  },
  chapterNames: {
    hollow: 'HollowFlowText',
    selection: 'DirectionAwareSelection',
    scan: 'ScanText',
    dither: 'DitherButton',
    mend: 'MendText',
    ghost: 'GhostPath',
    variants: 'Props',
    install: 'Install',
  },
  hero: {
    wordmark: 'Hello XYLITOL',
    wordmarkAria: 'Hello XYLITOL',
    lede: 'Five text effects and one button that answers back: an outline that flows and only fills under your cursor, a selection frame that knows which edge you came through, a reading head that scans the line, a sentence that mends itself when you rewrite it, a pill whose light arrives as halftone dots, and a pointer that replays the path it took across the words.',
    cue: 'Scroll — every effect below is live',
  },
  chapters: {
    hollow: {
      title: 'Outline that breathes.',
      lede: 'A six-stop gradient loops along the outline while a thinner highlight travels with it. Nothing is filled in — until your pointer gets close, and a soft radial reveal blooms under the cursor, keeping a little momentum when you stop.',
    },
    selection: {
      title: 'The frame remembers which side you came from.',
      lede: 'Every word is its own target. Come at it from the left and the accent sweeps in from the left; approach from below and it rises. Four corner handles snap out 60 ms apart, and the frame springs between words instead of teleporting.',
    },
    scan: {
      title: 'The sentence is the progress bar.',
      lede: 'A read head travels the line. Everything behind it keeps full ink, everything ahead stays a ghost, and the hot edge cools back to ink along a trail whose length follows its speed. Hand it a progress value and the sentence reports itself; leave the value out and it loops while something thinks.',
    },
    dither: {
      title: 'The halo is a halftone, not a haze.',
      lede: 'A pill whose surface is a grid of cells and whose light is a 4×4 Bayer matrix. Move across it and the glow arrives as rings of dots that switch on at exact thresholds; press it and a ring travels outward, picking cells off as it passes. Sparks land on four brightness rungs, so nothing in the field is a smooth gradient.',
    },
    mend: {
      title: 'The edit reports itself.',
      lede: 'Hand MendText a new string and it finds the seam on its own: the words that left squeeze into a struck line, the words that arrived grow out of the same gap. A swap crosses over inside one width instead of showing both sentences side by side, so a revision never turns into a redline.',
    },
    ghost: {
      title: 'The tutorial is a recording, not a screenshot.',
      lede: 'A pointer path is stored as character offsets rather than pixels, then replayed on the paragraph: the trail follows the words, widens with speed, and stops breathing at each hold. Narrow the window and it still lands on the same characters — because the recording remembers which word it was pointing at.',
    },
    variants: {
      title: 'Same frame, three moods.',
      lede: 'The fill is a prop, not a baked-in decision. Keep it solid, stop at the bare outline, or pin a target open so the box stays where it is. Hover any of the three to bring the frame in.',
    },
    install: {
      title: 'Six components, one stylesheet.',
      lede: 'Zero runtime dependencies. Drop it into a paragraph and the text keeps flowing like text — no wrappers, no layout shifts, no reset.',
    },
  },
  hollow: {
    flowingWord: 'FLOWING',
    flowingAria: 'FLOWING',
    stageCaption: 'Default palette · six stops · nine-second loop · fill appears inside a 145-unit radius',
    specimens: {
      cobalt: { word: 'COBALT', caption: 'cool stops' },
      ember: { word: 'EMBER', caption: 'warm stops' },
    },
  },
  selection: {
    beforeName: "Hi, I'm ",
    afterName: '. I build ',
    afterKit: ' for developers and ',
    afterMotion: ' for designers.',
    nameWord: 'XYLI TOL',
    nameHint: 'hover here',
    kitWord: 'Effects Kit',
    motionWord: 'motion studies',
    note: 'Click a target to pin the frame over the whole phrase; click again to release it. The paragraphs above and below keep their line height while the frame moves.',
    facts: [
      { value: '4', label: 'sweep directions, picked from the edge you entered' },
      { value: '60 ms', label: 'stagger between the four corner handles' },
      { value: '1 spring', label: 'carries the frame between words instead of a jump' },
    ],
  },
  scan: {
    stateGroup: 'Scan state',
    states: {
      idle: 'idle',
      pending: 'pending',
      streaming: 'streaming',
      done: 'done',
      error: 'error',
    },
    progress: 'progress',
    readoutLabels: {
      idle: 'idle',
      scanning: 'scan',
      done: 'done',
      error: 'error',
    },
    specimen: 'Reading 1,284 tokens for collisions',
    prose:
      'The queue is replaying forty-one events from the last checkpoint, folding each one into the snapshot before the writer accepts new work.',
    note: 'Wrapped text keeps its own line breaks and letter spacing — the gradient is clipped to the glyphs, so nothing is re-laid out. The needle steps aside once the box holds more than one line.',
  },
  dither: {
    button: 'Copy install command',
    busy: 'Copying',
    done: 'Copied',
    radius: 'radius',
    spark: 'spark',
    cell: 'cell',
    prose:
      'Every cell knows one thing: the threshold it answers to, read from a 4×4 Bayer matrix plus a hair of jitter so the tile does not settle into a lattice. Coverage above that threshold switches the cell on, anything below leaves it dark — which is why the halo arrives in rings instead of a blur, and why it holds its shape at any accent colour.',
    note: 'Sparks land on four brightness rungs, so nothing in the field is a smooth gradient. The ring is drawn from the press point, not from the pointer, and the loop parks itself as soon as the last cell decays: an idle button costs no frames.',
  },
  mend: {
    versions: [
      'This approach is a little expensive; drop the cache layer first.',
      'This approach is a little cheaper; keep the cache layer for now.',
      "The trade-off isn't actually cheap; the cache layer's writes amplify it.",
      "The trade-off isn't really cheap; the cache layer's writes amplify it threefold.",
    ],
    original:
      'MendText tracks the edit inside one sentence, not a diff between two documents. Give it the new copy and it finds the seam: departing words collapse into a rule, arriving words grow from that same seam.',
    revised:
      'MendText tracks the edit inside one sentence: the same place, before and after the rewrite. Give it the new copy and it finds the seam: departing words collapse into a rule, arriving words grow from that same seam.',
    aside:
      'That is the difference from ScanText: ScanText says where the reading has reached; MendText says what the sentence just became.',
    cycle: 'Revise again',
    hint: 'Tap to swap one clause inside the paragraph',
    note: 'Type size, line height, and letter spacing remain those of body copy: kept characters stay purely inline, and the line closes around the width of the departing run, so nothing jumps and no FLIP pass is needed. The price is one rule — the edited run has to stay on a single line. In a wrapped paragraph, replaced characters leave immediately rather than animating their width, which would reflow them into a column of one character per line.',
    collapse: 'collapse',
    revisionGroup: 'Revision',
    phases: {
      settled: 'settled',
      rewriting: 'rewriting',
      erasing: 'erasing',
    },
  },
  ghost: {
    playbackGroup: 'Playback',
    play: 'play',
    step: 'step',
    next: 'next →',
    speed: 'speed',
    steps: [
      'Drop in at the opening and let the pointer ride the words',
      'Hold on “replay”: the sentence leans here',
      'The last stop lands past the period, then the hand lifts',
    ],
    phases: {
      idle: 'idle',
      playing: 'playing',
      holding: 'holding',
      ended: 'ended',
    },
    pairNote:
      'The same trace at 260px wide wraps in completely different places. The pointer still lands on those characters because the trace stores not pixels but “which character + offset inside it.” Resizing, changing fonts, and scrolling all work without recording again. The trail breaks at line wraps instead of cutting diagonally through two lines.',
  },
  variants: {
    solidWord: 'solid',
    outlineWord: 'outline',
    pinnedWord: 'pinned',
    solidCode: 'fillColor',
    solidText: 'inherits the accent',
    outlineCode: 'fillColor="transparent"',
    outlineText: 'leaves the letters alone',
    pinnedCode: 'selected',
    pinnedText: 'keeps the box open',
  },
  install: {
    snippet: `import { DirectionAwareSelection, SelectionTarget } from '@xylitol0520/ui'
import '@xylitol0520/ui/style.css'

export function Intro() {
  return (
    <DirectionAwareSelection color="#3074FE" fillColor="transparent">
      <p>
        Come at <SelectionTarget words="this word" hint="try it" /> from any side.
      </p>
    </DirectionAwareSelection>
  )
}`,
    notes: [
      'No runtime dependencies',
      'TypeScript types included',
      'prefers-reduced-motion aware',
      'Keyboard focus paints the same frame',
    ],
    noteBefore:
      'Styles are opt-in: import the stylesheet once at your app entry. Every other behaviour is a prop, and a target with no ',
    noteBetween: ' and no ',
    noteAfter: ' stays inert text.',
  },
}

const DICTIONARIES: Record<Locale, Copy> = { zh, en }
const STORAGE_KEY = 'xylitol-ui-showcase-locale'

interface I18nValue {
  locale: Locale
  copy: Copy
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nValue | null>(null)

function storedLocale(): Locale {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'en' || value === 'zh' ? value : 'zh'
  } catch {
    return 'zh'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(storedLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Language can still change for this visit when storage is unavailable.
    }
  }, [])

  const copy = DICTIONARIES[locale]

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = copy.meta.title

    const descriptions: Array<[string, string]> = [
      ['meta[name="description"]', copy.meta.description],
      ['meta[property="og:title"]', copy.meta.title],
      ['meta[property="og:description"]', copy.meta.description],
      ['meta[name="twitter:title"]', copy.meta.title],
      ['meta[name="twitter:description"]', copy.meta.description],
    ]

    for (const [selector, value] of descriptions) {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value)
    }
  }, [copy, locale])

  const value = useMemo(() => ({ locale, copy, setLocale }), [locale, copy, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}


# MendText 形态稿

> 单段落内的字符级改写动画。替换文本即演出，不需要调用方传 diff。
> 名字建议 `MendText`（缝补）。若坚持 `LiveDiffText`，改 export 名即可，API 不变。

---

## 0. 设计内核：字塌成线，而不是变红再划线

删除的三段应当是同一件事：

```
字（全墨） → 字（褪墨 + 横向收缩） → 一条 1px 细线 → 擦除
```

市场做法是「变色 → 划线」，两个动作、两个语义。这里只保留一个动作：**字形自己收缩成那条线**。好处是中间态不需要新颜色，也不会把这库单色加一点彩的底子弄脏。

插入同理：新字不从 0 淡入（那是 loading 的语汇），而是从 28% 墨「上升」到 1，再让下划线从零生长——像墨还没干。

---

## 1. 和现有四件的关系（先纠正我上一轮的话）

看过代码后有一处要收回：

- `HollowFlowText` 是 SVG `<text>`，不切字。
- `ScanText` 是整段 `background-clip: text` + 一条渐变，**DOM 里没有逐字元素**。

所以我之前说「CounterWeight 先做，替 LiveDiffText 铺 token 层」是不成立的——现在根本不存在逐字层，而且两者需要的层不是同一个东西：

| | 需要什么 | 能共享吗 |
|---|---|---|
| CounterWeight | 静态逐 token span，不测 rect | 只共享 `diff` |
| MendText | 逐 run 元素 + 稳定 key + 两次 rect 测量 | 共享 `diff` |

结论：MendText 是这库里第一个真正需要逐元素渲染的组件，`src/lib/diff.ts` 由它建立。

补充（实现后修正）：原计划的 `lib/tokenize.ts` 不需要了。按词单元切分不稳定——删掉一个表情就会让相邻的 `a`、`b` 合并成一个词单元，对齐关系自己崩掉。最终是「字级 LCS + 碎片合并」：拉丁字母的 1–2 字 keep 段如果夹在两处改动之间，就并进同一个 hunk，汉字豁免。顺序可以改成 **TickerRoll → MendText（招牌先上）→ CounterWeight**。

---

## 2. 三段时序（t = 0 是提交新文本的那一刻）

| 段 | 区间 (ms) | 动作 | 缓动 |
|---|---|---|---|
| A 上墨 | 0–180 | 新增 run 墨 0.28 → 1 | ease-out |
| A′ 生长 | 40–280 | 新增 run 下方 1px 线 `scaleX` 0 → 1 | `cubic-bezier(.22,.61,.36,1)` |
| B 存疑 | 0–120 | 被删 run 维持全墨；删除线 `scaleX` 0 → 1（自左向右画） | linear |
| C 塌陷 | 120–520 | 被删 run 墨 1 → 0.4，同时 `scaleX` 1 → 0（origin 左） | ease-in `(.55,0,.85,.36)` |
| D 归位 | 120–520 | 由 C 的宽度动画自带，不单独占一段 | 同 C |
| E 收尾 | 520–840 | 本批改写结束，`data-phase` 从 `erasing` 转 `settled`，线淡出 | ease-out |

总时长含 hold 约 520ms；`MEND_DEFAULTS` 里 hold 120 / collapse 400 / settle 320。

**快进规则**：若 collapse 走完之前来了下一批改写，上一批立即 `display:none` 退场，不做排队。流式场景下最多同时存在一批墓碑，不会叠三层。

---

## 3. 重排跟着动画走，不做 FLIP

原稿这里写的是「520ms 一次性重排 + FLIP」，实现时改掉了，原因有两个硬伤：

- 保留字为了能 FLIP 必须变成 `inline-block`，而行尾那个**空格会被 inline-block 裁掉**，整行词间距消失；保住空格就得把空格单独切出来，kerning 又断。
- 跨会话缓存 rect 还得处理「这一行这几天被别的东西挤过」的失效，代价远超收益。

改成：**被删 hunk 的 `width` 在 collapse 时长内动画到 0，整行重排跟着动画走**。

- 保留字全程是纯 `inline`，空格、kerning、连字一样不少。
- 一次性把测量宽度交给 CSS 变量 `--mend-w`，`@keyframes` 的 `from`/`to` 都用它（`close` 是 `var(--mend-w)` → 0，`open` 是 0 → `var(--mend-w)`），动画由 CSS 自己跑，JS 不再管过渡的起停。
- 替换（swap）时，走的和来的两段**同时**做宽度动画，来的那段 `from` 是 0，所以两句永远不并排——这是首版「同流并排」被判定不可接受之后的修法。
- 被删 hunk 的墨和宽度用**同一条缓动曲线**，字形才不会溢出到盒子外。

代价：单行才能动画。跨行的 hunk 直接 `display:none` 退场——如果也做宽度动画，文字会一边收一边重排成一列一个字。


---

## 4. DOM 结构

等段保持成段纯文本，**只给 diff 的 hunk 建元素**。这一条是保 kerning 的关键：整句切字会杀掉 `fi`、`WA` 这类字距，因为 kerning 只在同一文本运行内生效；只切 hunk，损伤面就落在 hunk 边界上，肉眼看不出。

```tsx
<span className="mend-text">
  <span className="mend-text__run">The quick </span>       {/* 纯 inline，不建盒子 */}

  <span className="mend-hunk" data-kind="gone" aria-hidden="true">
    <span className="mend-hunk__ink">brown</span>          {/* 会横向收缩的部分 */}
    <span className="mend-hunk__rule" aria-hidden />       {/* 那条线 */}
  </span>

  <span className="mend-hunk" data-kind="new" data-swap="true">
    <span className="mend-hunk__ink">red</span>            {/* 从缝里长出来 */}
    <span className="mend-hunk__rule" aria-hidden />       {/* 下划线，由盒宽带出 */}
  </span>

  <span className="mend-text__run"> fox</span>
</span>
```
```

塌陷必须走 `display: inline-block`——**`transform` 对 `display:inline` 的非替换元素无效**。但**保留字不能变成盒子**，否则行尾空格被裁、kerning 断掉。

---

## 5. 塌陷与缝补的实际写法

```css
.mend-hunk { position: relative; display: inline-block; vertical-align: baseline; }
/* 只有测量判定为单行之后才 nowrap，否则收窄时字会折成一列 */
.mend-hunk[data-fit='single'] { white-space: nowrap; }

/* 走的字：盒宽收到 0，墨朝线条塌缩，两者同一条曲线，字形不会溢到盒外 */
.mend-hunk[data-kind='gone'][data-fit='single'] {
  animation: mend-close var(--mend-collapse) cubic-bezier(.4, 0, .2, 1) var(--mend-hold) both;
}
.mend-hunk[data-kind='gone'] .mend-hunk__ink {
  transform-origin: 0 50%;
  animation: mend-squeeze var(--mend-collapse) cubic-bezier(.4, 0, .2, 1) var(--mend-hold) both;
}

/* 删除线：在 hold 之内从左扫到右；swap 的 hold 是 0，所以给它 140ms 的下限 */
.mend-hunk[data-kind='gone'] .mend-hunk__rule {
  position: absolute; top: 52%; right: 0; left: 0;
  height: var(--mend-strike-width);
  background: var(--mend-strike);
  transform: scaleX(0); transform-origin: 0 50%;
  animation-name: mend-draw;
  animation-duration: max(var(--mend-hold), 140ms);
  animation-delay: var(--mend-hold);
  animation-fill-mode: both;
}

/* 来的字：盒宽从 0 开到 --mend-w，字形同一曲线展开，所以缝里长出来 */
.mend-hunk[data-kind='new'][data-swap='true'][data-fit='single'] {
  animation: mend-open var(--mend-collapse) cubic-bezier(.4, 0, .2, 1) both;
}
.mend-hunk[data-kind='new'][data-swap='true'] .mend-hunk__ink {
  transform-origin: 0 50%;
  animation: mend-unfold var(--mend-collapse) cubic-bezier(.4, 0, .2, 1) both;
}

@keyframes mend-close   { from { width: var(--mend-w, auto); } to { width: 0; } }
@keyframes mend-open    { from { width: 0; } to { width: var(--mend-w, auto); } }
@keyframes mend-squeeze { from { transform: scaleX(1); opacity: 1; }
                          to   { transform: scaleX(0); opacity: var(--mend-ink); } }
@keyframes mend-unfold  { from { transform: scaleX(0); opacity: var(--mend-fresh-ink); }
                          to   { transform: scaleX(1); opacity: 1; } }
```

几条口径：

- swap 的下划线**不单独生长**：盒宽张开时那条 `inset:0` 的 1px 线自然被带出来，所以 `mend-grow` 在 swap 上关掉。
- 纯删除保留 `hold` 停留（默认 120ms）再塌；swap 的 `hold` 是 0，缝一出现就开始交叉。
- 线在 `settled` 相位淡出，`data-phase` 由组件写在根节点上，CSS 只负责 `opacity`。

**代价说明**：交叉那 200ms 里新旧字形本来就会重叠——这正是「同一处被改」的读法，不是瑕疵。真正被放弃的是「被推动的保留字滑过去」：现在它是跟着盒宽连续让位的，没有滑行动画，但也没有跳位。


---

## 6. 宽度动画的边界

不再有 FLIP，只有三条与盒宽有关的纪律：

1. **只对单行动画**。测量时 `rect.height > lineHeight*1.6` 就判定为跨行，直接 `display:none` 退场，不写 `--mend-w`。
2. **`white-space: nowrap` 与 `data-fit='single'` 同生共死**。`data-fit` 只由组件在测量后加上，所以没有 JS / SSR 输出永远不会误触动画；塌陷时盒子变窄，如果不 `nowrap`，字会一边收一边折行。
3. **`--mend-w` 必须先写、再挂 `data-fit`**。动画的 `from` 引用了这个变量，先加 `data-fit` 会让第一帧解析出 `auto`。

`@keyframes mend-close` / `mend-open` 与 `mend-squeeze` / `mend-unfold` 共用 `cubic-bezier(.4,0,.2,1)`：曲线一致，字形才不会在收缩过程中跑到盒子外。

---

## 7. API 定稿

```ts
export type MendPhase = 'settled' | 'rewriting' | 'erasing'

export interface MendTextProps {
  /** 当前文本。直接换值就演一次改写，不用传 diff。 */
  children: string
  /** 被删的字停留多久再开始塌，ms。0 表示立刻塌。 */
  hold?: number
  /** 塌陷时长，ms。 */
  collapse?: number
  /** 塌陷结束后再等多久算「改完了」，ms。 */
  settle?: number
  /** 新字上墨时长，ms。 */
  fresh?: number
  /** 下划线生长时长，ms。 */
  rule?: number
  /** 新字起始墨量，0 到 1。 */
  freshInk?: number
  /** 塌陷终墨，0 到 1。 */
  ink?: number
  /** 线色。默认 color-mix(in oklab, currentColor 46%, transparent)。 */
  strike?: string
  /** 线宽，px。 */
  strikeWidth?: number
  /** 元素类型，默认 span。 */
  as?: ElementType
  /** 时段切换回调，给上层做「改完了」的时机。 */
  onPhase?: (phase: MendPhase) => void
  className?: string
  style?: CSSProperties
}

export const MEND_DEFAULTS = {
  hold: 120,
  collapse: 400,
  settle: 320,
  fresh: 180,
  rule: 240,
  freshInk: 0.28,
  ink: 0.4,
  strikeWidth: 1,
} as const
```

内部规则：

- **首帧不演**。上一版由 `useRef` 存，首次挂载 silent，SSR 直接吐新文本。
- **diff**：`src/lib/diff.ts` 已落地。剥公共前后缀 → 中段字级 LCS → 碎片合并（拉丁 1–2 字的 keep 段并进 hunk，汉字豁免）→ 产出带双向偏移的 run。超过 160k 单元格预算直接退化为「整段走 + 整段来」。
- **实测**：200/600/2000 字的段内小改分别是 0.022 / 0.038 / 0.060 ms；600 字整段重写 0.30 ms。跑在每次改写上完全不必节流。
- **没有 `unit` prop**。粒度由 diff 内部决定，调用方选不出来也不该选。
- **快路径**：新文本是旧文本的前缀延伸（流式追加）→ 无删除、无重排，只跑 A/A′ 两段。
- **可访问性**：被删的 `hunk` 全部 `aria-hidden="true"`，所以屏幕阅读器读到的是「keep + new」——恰好等于新文本。因此根节点**不设** `aria-label`（设了反而会重复朗读一遍）。
- **reduced-motion**：不塌陷，被删 hunk 直接 `display:none`，线不出现，新字一次到位。
- **print**：只印新文本，线不印（沿用 `ScanText` 的 print 规矩）。

---

## 8. 验收清单

- 单字替换（`brown` → `red`）：走的字 120ms 后开始收，400ms 收完，全程不跳位。
- 句内互换（`成本→代价` / `高→低` / `砍掉→留着`）：两句**不并排**，交叉中点仍读成一句（见 `new-chat-1/filmstrip.png` 的冻结帧）。
- 词尾追加：无删除，只有下划线从左往右长。
- 句首插入 12 字：后文的重排跟着后一段的宽度动画走，没有二次位移。
- 跨行删除：hunk 直接退场，不出现「重排成一列一个字」。
- 120px 窄容器、三行文本：无横向滚动条、容器高度不跳。
- 连续两批改写：上一批先退场，不叠层。
- 屏读：朗读新文本，无重复。
- `prefers-reduced-motion` / print / 深色背景各走一遍。
- `pnpm typecheck`、`pnpm build`、`pnpm build:site` 通过，`showcase` 里 05 章能跑。

---

## 9. 首版明确不做

- 词序交换的可视化（`a b` → `b a` 的位移当普通删除 + 插入处理）。
- 多段落整页 diff——只做单段落内的改写。
- 反向动画（撤销时再演一遍）。
- 与 `ScanText` 的联排 demo：那是 showcase 的活，且必须做时序编排（扫描头走过之后才允许改），不能指望两个组件自动合体。

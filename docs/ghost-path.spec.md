# GhostPath 形态稿

> 把一次真实操作录下来，在同一段文字上回放：一条指针轨迹、几个停顿点、每一步该干什么。
> 名字 `GhostPath`（幽灵轨迹）。替代「静态截图 + 箭头」那一套教程语汇。
> 纯覆盖层，不碰文字，不改布局。

---

## 0. 设计内核：指引是「时间的」，不是「空间的」

一张截图加一支箭头，断言的是**位置**：「它在这里」。
GhostPath 断言的是**过程**：「它从这儿出发，走过这段，在这里停了一下，停的时候该点这里」。

三样信息缺一不可：

```
轨迹（怎么动的） + 停顿（在哪定的） + 步骤（停的时候说什么）
```

少了停顿，它就是一支会动的箭头——比截图还差，因为观众得多花几秒等它走完。
少了步骤，它是给眼睛看的哑剧——教程的核心信息（“这一步要输入什么”）丢了。
少了轨迹，它就是截图。

所以这个组件的真正产物不是「一条曲线」，而是**一条带停顿与字幕的时间轴**。曲线只是它的渲染结果。

---

## 1. 判据复核

| 判据 | 结论 |
|---|---|
| 一句话说得清 | 「把一次操作录成轨迹，在同一段文字上回放」 |
| 截图留不住 | 静帧只剩一条曲线，路径的时间与停顿全丢 |
| 吃真实数据 | 吃的是录制的采样，不是 variant 枚举 |
| 不能用来建站 | 它是覆盖层，不参与布局，做不了骨架 |
| 不改布局 | 绝对定位覆盖，文字一个像素都不动 |
| **正交** | 库里第一件可以叠在任何组件之上的东西 |

最后一条是它与 MendText 的根本差别：前五件都在改「文字的某一个属性」（描边、墨量、剪裁、盒宽），彼此会打架；GhostPath 只改「文字之上那一层」，所以：

- 叠在 `ScanText` 上：边扫边指。
- 叠在 `MendText` 上：指完这里，那段就被改写。
- 叠在 `DitherButton` 上：指这里按。

这是这个库唯一不需要「避让」的组件。

---

## 2. 坐标系：锚在文本上（命门）

### 2.1 为什么不能存像素

录制的原始数据是视口坐标。以下任一情况发生，回放就错位：

| 变化 | 后果 |
|---|---|
| 视口宽度不同（820 → 375） | 断行位置全变，轨迹横穿两行 |
| webfont 加载完成 | 字宽变化，句尾偏移几十像素 |
| 滚动 / 缩放 | 整体平移，轨迹飘到段落外 |
| 用户改了字号 / 主题 | 行高与字宽同时变 |

所以**不能存像素，只能存「相对文本的地址」**。

### 2.2 存什么

每个采样点存三个数，全部相对「段落盒」归一化：

```ts
interface Sample {
  t: number      // 相对录制起点的毫秒
  at: number     // 字符偏移（UTF-16，相对 children 字符串）
  bias: number   // 字内水平比例 0..1，(x - char.left) / char.width
  dy: number     // 行盒内竖直比例 0..1，(y - char.top) / char.height
  kind: 'move' | 'pause' | 'click' | 'drag'
}
```

`at` 是用 `document.caretRangeFromPoint(x, y)` 拿到的字符位置（Firefox 用 `caretPositionFromPoint`）。
`bias` / `dy` 解决「落在那个字的哪一侧、哪个高度」——指针不会正好压在字心上，落点要能落在字的左三分之一、右三分之一。

**`bias` 必须是字内比例，不能是行内比例。** 这是这套坐标系唯一的致命处：行内比例记的是「在整行宽度的 62% 处」，行宽一变（820 → 375 重排），这个 62% 就不再指向那个字了——820 宽的行 62% 在 484px，375 宽的行 62% 在 208px，而 `at` 指的字符实际落在 180px 附近，差 28px，验收的 ±6px 直接挂。字内比例没这个问题：行宽怎么变，那个字符的盒子跟着走，比例仍然落在同一个字里。

结论：**`at` 决定落点，`bias` 只负责字内精度**，两者不再打架。

**这不是页面坐标的压缩，是坐标系的替换**：整段文字重排之后，`at` 依然指向同一个字。

### 2.3 字符矩形表（char rect table）

回放要把 `(at, bias, dy)` 还原成 `(x, y)`。为此只需要一种东西：**那个字符的盒子**。

```ts
// at → 字符盒，坐标相对视口
interface CharRect { left: number; top: number; width: number; height: number; line: number }
```

建法（一次布局 flush，回放期间不重建）：

```ts
const range = document.createRange()
range.setStart(textNode, at)
range.setEnd(textNode, at + codePointLength(at))   // 代理对不要切半个
rect = range.getClientRects()[0]
```

要点：

1. **只对 trace 里出现过的 `at` 建**，去重后一般不到 100 个（几百个采样点会反复经过同一批字），不是给整段每个字建表。600 字的段落按 600 次 Range 建表要几十毫秒，resize 时会掉帧；按出现过的 offset 建表是几毫秒。
2. 一个字符不会跨行，取 `getClientRects()[0]` 就够。
3. `line` 用 `rect.top` 归一后编号，**换行检测靠它**：相邻两点的 `line` 不等即换行。
4. 兜底：空格、行尾、越界 offset 拿不到 rect → 归到最近一个拿得到的字符，`bias` 记 0.5。越界的 `at`（trace 与 `children` 不一致）先走 §3 的重映射，再兜底。

不需要行表。行表能做的一切（换行判断、断笔位置）都能从字符盒的 `top` 拿到，而它比行表准：

### 2.4 还原

```ts
const rect = charRectFor(at) ?? nearestCharRect(at)
const x = rect.left + bias * rect.width  - rootRect.left
const y = rect.top  + dy  * rect.height  - rootRect.top
```

**减掉 `rootRect` 之后，整套坐标就活在 overlay 的局部空间里。** 滚动、容器滚动、页面平移全部由 DOM 自己承担，回放期间**一次布局读取都不做**。这是能每帧跑满 60fps 的原因，也是不要把「每帧读一次 rect」写进实现的原因。

### 2.5 精度与红线

- 目标精度 **±6px**。指针指引不需要亚像素，观众也分辨不出 3px。
- **不做逐字 span**。把每个字切成 inline-block 能把精度做到 1px，但会杀掉 kerning 与连字——那是 MendText 已经踩过的坑，同一个代价不付第二次。
- 一个字符盒 + 字内 `bias`，精度就是「字宽的量级」，对 36px 的标题是 ±30px 里的任意点，对 16px 正文是 ±8px 里的任意点——比目标还细，因为 `bias` 本来就落在字里。

---

## 3. 数据格式 v1

一份 trace 就是一个 JSON 文件，进 git，可 diff、可 review、可手改。

```json
{
  "v": 1,
  "size": "820x360",
  "text": "这个方案的成本有点高，先把缓存层砍掉再说。",
  "steps": [
    "找到「缓存层」这三个字",
    "按住 Shift，选中整个从句",
    "把它删掉，注意别碰后面的句号"
  ],
  "samples": [
    [0, 11, 0.42, 0.5, "move"],
    [180, 14, 0.08, 0.5, "move"],
    [240, 15, 0.62, 0.5, "pause"],
    [980, 15, 0.62, 0.5, "pause"],
    [1040, 19, 0.31, 0.5, "move"],
    [1420, 21, 0.5, 0.5, "click"]
  ]
}
```

`at` 的合法范围是 `0..text.length`。上例的 `text` 是 21 个字，最后一个点 `at: 21` 贴在句号后面——**超出这个范围的 trace 是坏的，构建期校验要拦住**（初稿里写过一个 `at: 24`，那是坏数据）。

- `text`：录制时的原文。回放时与 `children` 不等，**不要降级**，用 `src/lib/diff.ts` 重映射：对每个 `keep` run，把 `prevAt + i` 映射到 `at + i`；`gone` run 的 offset 映射到它被切开的接缝。`at` 和 `DiffRun` 都是 UTF-16 偏移，两家天生对齐，重映射是十来行的事，比重排降级准得多。
- `samples`：数组而非对象，因为一条 trace 常有几百个点，键名重复是纯浪费。
- `steps`：与 `kind: 'pause'` 一一对应（第 n 个 pause = 第 n 步）。多一个少一个都由构建期校验。
- 未知字段一律忽略（前向兼容），缺 `v` 视为 1。

**简化规则**：`kind: 'move'` 的段做 Douglas–Peucker（ε = 0.8px），`pause` / `click` / `drag` **永不简化**——停顿正是全部信息所在，简化算法天生会削掉它。

简化必须**按行分段**，绝不跨行、绝不跨断笔点跑。一条跨行的 `move` 段如果被 DP 从两端各留一个点，中间的点会被抹掉，连出来就是一条把两行斜着串起来的直线——恰好是验收清单里明令禁止的那条。段内简化，行间断开，两条规则一起守。

同样的道理适用于**停顿吸附**：吸附到最近的词边界，±1 字符内，绝不跨行。

---

## 4. 回放时间轴

时间以采样时钟为准，播放时钟只是它的缩放。

| 概念 | 行为 |
|---|---|
| `speed` | 1 = 原始时长。常用 0.5（教程）/ 0.25（演示大屏） |
| `progress` | 受控 0..1。给了就进 scrub 模式，不给则自动播放 |
| `pauseAt` | 单步模式：走到第 n 个 pause 就停住，等「下一步」 |
| `loop` | 走完回到 0，间隔 900ms 再放（避免闪烁） |

相位（写在根节点 `data-phase` 上，同时回调 `onPhase`）：

```
idle     还没开始，或 progress = 0
playing  轨迹在走
holding  停在某个 pause 点，等下一步
ended    progress = 1，最后一个点常驻
```

`holding` 是独立相位而不是 `playing` 的子状态——因为教程 UI 要靠它决定「下一步按钮亮不亮」。

`onStep(index)` 在进入每个 pause 时回调，供上层高亮对应步骤文本。

---

## 5. 渲染

```tsx
<span className="ghost-path">
  {children}                                  {/* 原样，不切、不包、不改 */}
  <span className="ghost-path__overlay" aria-hidden="true">
    <svg viewBox="0 0 W H">
      <path className="ghost-path__trail" />   {/* 已经走过的部分，带渐隐 */}
      <circle className="ghost-path__head" />  {/* 手 */}
    </svg>
  </span>
</span>
```

- overlay：`position: absolute; inset: 0; pointer-events: none; contain: layout paint;`
- 根节点 `position: relative`。**文字节点完全不动**——不建 span、不改 `display`。

**轨迹怎么画**，三个方案，最后选的是 B：

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A `dashoffset` 推进 | 一次性生成完整 path，动画 `stroke-dashoffset` | 最便宜 | 笔宽恒定，做不出尾迹渐隐 |
| B 逐帧截取重绘 | 按弧长切出 `[0, s(t)]`，生成 path 写回 `d` | 断笔、渐隐、笔宽都自由；语义与几何一一对应 | 每帧拼一次字符串 |
| C `pathLength` 归一 + dash 切片 | path 上标 `pathLength`，用 `dasharray` 切 | 每帧只改两个数 | **浏览器在每个子路径上重置 dash 模式** |

**C 被实测否掉**：这个组件的轨迹必须按行断开，而 dash 模式在每条子路径上重新开始，于是 `dasharray` 量的是「每条子路径的 62%」而不是「整条路径的 62%」，画出来的是一串碎片，不是一条走到一半的轨迹。子路径越多错得越明显。

所以回到 B。一帧拼一次 `d` 字符串，几十个点，实测开销可以忽略；换来的是断笔、尾迹、笔宽三者都不需要跟浏览器的 dash 语义搏斗。多出来的那点 CPU，比一条画错的线便宜。

### 5.1 时间 → 弧长：方向不能反

这是最容易写错、且错了看不出来的地方。正确顺序是：**时间先落样本区间，再在区间内插弧长**。

```ts
// 建几何时算一次
cum[i]   // 第 i 个点之前的累计弧长（按点间直线距离累加）

// 每帧
const i = segmentAt(t)                                   // t 落在哪两个样本之间
const s = cum[i] + (cum[i + 1] - cum[i]) * (t - t[i]) / (t[i + 1] - t[i])
```

反过来写（先把 `t / T` 归一，再乘总长）会得到一个**匀速**的手：停顿点在时间轴上占 0.7 秒却只走了 0 像素，归一化会把它摊平成匀速前进——这个组件的全部信息就在那 0.7 秒里。匀速的手等于没有停顿，没有停顿的轨迹比截图还差，因为观众得等它走完。

`cum` 用点间直线距离累加即可，平滑曲线的弧长误差在 1% 以内，映射的是时间不是形状，不需要更准。

笔宽随速度：`w = clamp(weight / (1 + speed * 0.5), 1.4, weight)`，`speed` 单位 px/ms。旧的 `5.4 - speed * 0.055` 是死的：快速划 5px/ms 只掉 0.27px，5.4 和 5.13 肉眼没有区别。

停顿的表现：`head` 从 dot 涨成 ring（1.15 倍）并呼吸一圈，同时步骤文本高亮——**这才是「停一下」的意义**，光停不动没人看得懂。

**测量时机**：mount / resize / `document.fonts.ready` / children 变化。回放过程中**一次都不测**。

**覆盖层几何**：根节点是 inline 元素时，绝对定位子元素的 containing block 是首行到末行盒拼出来的矩形，`inset: 0` 在 8 行段落里会比整个段落还宽，于是 SVG 坐标系和 `rootRect` 对不上，轨迹整体偏移且被拉伸。

不要试图用 `translate` 把 overlay 挪到 `rootRect` 上——实测第一次测量发生在 inline 完成布局之前，量到的基点是 0，于是每测量一次就多加一次偏移，越测越远。正确做法是**放弃对齐，改用 overlay 自己的原点当坐标系**：

```ts
overlay.style.width  = `${rootRect.width}px`
overlay.style.height = `${rootRect.height}px`
const box = overlay.getBoundingClientRect()      // 它就是 SVG 的 (0, 0)
buildGeometry(trace, charBoxes, { left: box.left, top: box.top })
```

overlay 和文字同属一个 containing block，滚动时一起动，因此回放期间既不需要 translate，也不需要读布局。尺寸写死解决了 `inset: 0` 的宽度问题，原点问题则因为它和字符盒共享同一个参考系而自动消失。

---

## 6. 观感：raw 与 cleaned

真实指针采样有 3–4px 的高频抖动，直接回放就是「鼠标坏了」。

- 存两份：`samples`（raw，用于自检与二次清洗）与回放用的 cleaned（构建期或在 `traceFromEvents` 里生成）。
- 清洗三步：一阶低通（α = 0.18，只作用于相邻 `move` 点之间）→ DP 简化 → 停顿点吸附到最近的词边界（±1 字符内吸附，绝不跨行）。
- 清洗必须是**纯函数**且可复现：同一个 raw 永远得到同一个 cleaned，否则 git diff 会天天变。

---

## 7. 无障碍

- `steps` 对非装饰性用法是**必填**。缺了它，这个组件在「教程」场景里就是不合格的。
- **组件不渲染 steps**。它只通过 `onStep(index)` 告诉你停在第几步，步骤文本由调用方渲染——一旦它在内部排一个列表，就开始变成「教程容器」，那正是要防的大而全。调用方自己排 `<ol>`，天然可选中、可链接、可翻译。
- 播放时高亮当前步骤；点步骤文本可跳到对应 pause 点（`pauseAt` 的另一种入口）。
- `prefers-reduced-motion`：不播放轨迹，直接显示最终停点 + 完整步骤列表（步骤是内容，轨迹是修辞）。
- `print`：隐藏 overlay，按 steps 排成有序列表——纸上的轨迹没有意义，步骤有。

---

## 8. API 定稿

```ts
export type GhostPhase = 'idle' | 'playing' | 'holding' | 'ended'

export interface GhostTrace {
  v?: 1
  /** 录制时的视口尺寸，仅用于诊断，回放不依赖它。 */
  size?: string
  text: string
  steps: string[]
  samples: Array<[t: number, at: number, bias: number, dy: number, kind: string]>
}

export interface GhostPathProps {
  /** 录好的轨迹。组件只吃数据，不负责录。 */
  trace: GhostTrace
  /** 被指引的文字。只读，原文不动。 */
  children: string
  /** 播放倍速，1 = 原始时长。 */
  speed?: number
  /** 受控进度 0..1；给了就不自动播放。 */
  progress?: number
  /** 单步模式：走到第 n 个 pause 停住。 */
  pauseAt?: number
  loop?: boolean
  /** 手的样子。 */
  hand?: 'dot' | 'ring' | 'none'
  /** 轨迹色，默认 color-mix(in oklab, currentColor 42%, transparent)。 */
  trail?: string
  /** 轨迹最粗处，px。 */
  weight?: number
  onStep?: (index: number) => void
  onPhase?: (phase: GhostPhase) => void
  as?: ElementType
  className?: string
  style?: CSSProperties
}

export const GHOST_DEFAULTS = {
  speed: 1,
  weight: 3.6,
  capMs: 12_000,
} as const
```

**录制不进运行时包**。主入口只给一个纯函数：

```ts
traceFromEvents(events: PointerEvent[], text: string, steps: string[]): GhostTrace
```

录制钩子走独立子路径，不进主包：

```ts
// @xylitol0520/ui/dev
usePointerTrace(target: RefObject<Element>): { start(): void; stop(): GhostTrace | null }
```

把它塞进 `index` 然后写一句「dev-only」是自欺——只要从主入口导出，它就在包里，tree-shaking 只在没人 import 时才生效，而用了它的人一定会 import。单独一个 `./dev` 子路径是同一份决心的另一种写法。

做成 `<GhostPath.Recorder>` 就等于开了容器组件的口子，也是大而全的第一步。录制是开发期的活，不该出现在运行时包里。

---

## 9. 与库的关系

1. **正交叠加**：它不 import 任何组件，任何组件也不需要知道它存在。
2. **与 `diff.ts` 同族坐标**：`at` 是 UTF-16 偏移，`DiffRun` 的 `at` 也是。所以「这个字刚刚被改过」和「手正指着这个字」可以直接对齐，不需要中间层。
3. **配方一（边读边改 + 指引）**：`ScanText` 推到 hunk 起点前 → `MendText` 落改 → `GhostPath` 指向下一处。三个组件的接缝全在相位回调上，谁都不用认识谁。
4. **配方二（自证）**：showcase 用它指引自己的控件（「按这里试试」），文档自解释。

---

## 10. 验收清单

- 同一份 trace 在 820 / 375 两种宽度下都落在字上，偏差 ≤ 6px。
- webfont 从 fallback 切到目标字体后仍然对位。
- 段落滚动 200px 后仍然对位（回放期间零布局读取，滚动由 DOM 承担）。
- 120px 窄容器、8 行文本：轨迹不越出段落盒，不出现横穿两行的直线。
- 8 行段落里 overlay 的宽高等于段落矩形，而不是 containing block 矩形（差超过 1px 即为错）。
- 停顿点精确停在词上，ring 与步骤高亮同步。
- 把 `progress` 从某个 pause 的起点扫到终点，head 位移 < 1px（时间 → 弧长没写反的判据）。
- `trace.text` 与 `children` 不同时，经 diff 重映射后仍落在语义对应的字上。
- 字符矩形表只对 trace 里出现过的 offset 建，resize 时重建不卡帧。
- `speed` 0.25 / 1 / 4 都可读；`progress` 受控能 scrub 到任意时刻。
- 连续两次 `children` 变化（改写中）几何重建一次，不抖。
- `prefers-reduced-motion` / print 各走一遍。
- `pnpm typecheck`、`pnpm build`、`pnpm build:site` 通过。

---

## 11. 首版明确不做

- **录制 UI**（不做 `<GhostPath.Recorder>`，只给纯函数与 dev hook）。
- **分支轨迹**（「点这里或那里」）。一旦有分支，回放就变成状态机，这个库就开始像框架。
- **callout 气泡 / 文字标注**（先用 steps 高亮，v2 再说）。
- **自动判断该指哪个元素**（不做 OCR、不做语义定位）。
- **跨组件路径 / 跨页导航**。
- **滚轮与键盘操作路径**（只录指针；`drag` 只记 `kind`，不解释语义）。

---

## 12. 生产流程（这条比组件本身重要）

```
开发期录一遍（dev hook）
  → traceFromEvents 清洗成 JSON
  → 存进仓库（showcase/traces/*.json）
  → review 时 diff 能看出「这一步的落点改了」
  → 组件吃这份数据
```

它改的不是一个组件，是**教程的生产方式**：从「截图 + 箭头」变成「录一遍，存 JSON」。所以真正要做决定的是这一条；组件本身一周内能落地。

若这条不接受，这个组件就不该做——它只是把同一套静态图换个画法。

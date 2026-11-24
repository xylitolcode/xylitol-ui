# @xylitol/effects

A React component collection for expressive front-end effects.

## HollowFlowText

Hollow outlined text with a continuously flowing multicolor outline. Moving the pointer across the
text reveals the gradient fill only near the pointer, with a feathered edge and a small amount of
follow-through.

```tsx
import { HollowFlowText } from '@xylitol/effects'
import '@xylitol/effects/style.css'

export function Hero() {
  return (
    <HollowFlowText
      colors={['#22d3ee', '#a78bfa', '#f472b6', '#facc15']}
      duration={9}
      radius={145}
      ariaLabel="Hello XYLITOL"
    >
      Hello XYLITOL
    </HollowFlowText>
  )
}
```

The component scales to the width of its parent. Set the parent width to control the visual size.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string` | required | Text shown in the effect. |
| `colors` | `readonly string[]` | rainbow palette | Gradient stop colors. The first color is repeated automatically to keep the loop seamless. |
| `duration` | `number` | `9` | Seconds per full gradient pass. |
| `sparkDuration` | `number` | `6.5` | Seconds per travelling highlight pass. |
| `radius` | `number` | `145` | Pointer reveal radius in SVG viewBox units. |
| `textLength` | `number \| null` | `1080` | Stretched text width in viewBox units. `null` uses natural text width. |
| `fontSize` | `number` | `154` | Font size in SVG viewBox units. |
| `fontFamily` | `string` | `inherit` | Font family used by the wordmark. |
| `fontWeight` | `string \| number` | `800` | Font weight used by the wordmark. |
| `letterSpacing` | `string \| number` | `-0.055em` | Letter spacing; numbers are treated as pixels. |
| `outlineColor` | `string` | subtle blue-white | Resting hairline outline color. |
| `outlineWidth` | `number` | `1.15` | Resting outline width in pixels. |
| `flowWidth` | `number` | `1.7` | Animated outline width in pixels. |
| `sparkWidth` | `number` | `2.5` | Travelling highlight width in pixels. |
| `revealOpacity` | `number` | `0.96` | Opacity of the revealed gradient fill. |
| `haloOpacity` | `number` | `0.28` | Opacity of the glow around the revealed fill. |
| `ariaLabel` | `string` | `children` | Accessible label for the SVG. |
| `className` | `string` | — | Additional class name. |
| `style` | `CSSProperties` | — | Inline style and component CSS custom properties. |

The component automatically disables SVG animation when the user has
`prefers-reduced-motion: reduce` enabled.

## DirectionAwareSelection

A pointer frame for inline text: every word of a target becomes its own hoverable
box, and entering a word paints a spring-tracked frame that sweeps its accent fill
in from the edge the pointer came through. Corner handles pop out in sequence, an
optional badge reports the live `width × height` in rolling digits, and the frame
glides between words instead of jumping.

```tsx
import { DirectionAwareSelection, SelectionTarget } from '@xylitol/effects'
import '@xylitol/effects/style.css'

export function Intro() {
  return (
    <DirectionAwareSelection color="#3074FE" bounce={0.15} handleFill="#0b0c12">
      <p>
        Hi, I&apos;m{' '}
        <SelectionTarget
          words={['Ada', 'Lovelace']}
          href="https://example.com"
          hint="hover here"
        />
        . I build interactive things.
      </p>
    </DirectionAwareSelection>
  )
}
```

The provider renders no DOM of its own, so one `DirectionAwareSelection` can wrap a
whole paragraph, several paragraphs, or the entire page. `SelectionTarget` stays an
inline box, which means it flows with the surrounding text and can sit mid-sentence.

Targets are measured against themselves and divided by their current transform
scale, so the overlay keeps hugging the text inside scaled or animated containers.
Hovering requires a fine pointer; keyboard focus paints the same frame through
`:focus-visible`.

### DirectionAwareSelection props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `string` | `#3074FE` | Accent of the frame, handles, sweep and badge. |
| `bounce` | `number` | `0.15` | Spring overshoot, `0` settles flat and `1` is very springy. |
| `showSize` | `boolean` | `true` | Shows the `width × height` badge under the frame. |
| `fillOn` | `'icon' \| 'word' \| 'both' \| 'none'` | `'both'` | Which layer receives the accent sweep. `'icon'` keeps the reference behavior, where only the leading icon fills. |
| `padX` | `number` | `10` | Horizontal space between the hovered layer and the frame, in pixels. |
| `padY` | `number` | `6` | Vertical space between the hovered layer and the frame, in pixels. |
| `frameWidth` | `number` | `2` | Frame and handle border width in pixels. |
| `handleFill` | `string` | `transparent` | Fill behind the corner handles. Set it to the page background to mask the frame under the handles. |
| `fillColor` | `string` | `color` | Background painted by the sweep. Pass `transparent` to keep the frame on its own. |
| `fillTextColor` | `string` | `#fff` | Color of the copy painted over the sweep. `inherit` leaves the text looking untouched. |
| `children` | `ReactNode` | required | Subtrees that may contain `SelectionTarget`s. |

### SelectionTarget props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `words` | `string \| readonly string[]` | required | Hoverable words. A string is split on whitespace, and each word gets its own box. |
| `label` | `string` | joined words | Accessible name, used as `aria-label` when the target is a link. |
| `href` | `string` | — | Renders the target as a link. Without it the target is inert text. |
| `target` | `string` | `_blank` | Link target, only used together with `href`. |
| `icon` | `ReactNode` | — | Leading icon sized to a `1.1em` square; it becomes a hoverable layer of its own. |
| `hint` | `string` | — | Handwritten callout drawn above the target until the first interaction. |
| `selected` | `boolean` | — | Pins the box over the whole target, icon and words together, instead of only while hovering. |
| `onSelect` | `() => void` | — | Called on click, Enter or Space. Passing it makes the target selectable and suppresses link navigation. |
| `fillColor` | `string` | provider value | Overrides the sweep color for this one target. |
| `fillTextColor` | `string` | provider value | Overrides the sweep copy color for this one target. |
| `className` | `string` | — | Additional class name. |
| `style` | `CSSProperties` | — | Inline style merged with the component CSS custom properties. |

Pinning is controlled from the outside, so a parent can keep exactly one target selected:

```tsx
const [picked, setPicked] = useState<string | null>(null)

<SelectionTarget
  words="Ada Lovelace"
  selected={picked === 'ada'}
  onSelect={() => setPicked(picked === 'ada' ? null : 'ada')}
/>
```

A pinned target keeps its frame, sweep and badge, ignores hover, and re-measures itself
through a `ResizeObserver` so it stays glued when the line rewraps. Targets without `href`
become keyboard reachable toggles (`role="button"`, Enter/Space) once they receive `onSelect`.

The effect degrades to an instant frame, badge and sweep when the user has
`prefers-reduced-motion: reduce` enabled. Style it through the `--das-*` custom
properties: `--das-color`, `--das-pad-x`, `--das-pad-y`, `--das-frame-width`,
`--das-handle-fill`, `--das-fill` and `--das-hint-font`.

The handwritten hint uses `Caveat`; the showcase page loads it, and the CSS falls back to
`Bradley Hand`, `Segoe Print` and `cursive` when the font is not available. Point
`--das-hint-font` at your own loaded face if you want a different hand.

## Development

```bash
pnpm install
pnpm dev      # serves showcase/ at http://127.0.0.1:5173
pnpm check    # typecheck + build
```

The repository keeps the library and the site apart: `src/` is the library and
`src/index.ts` is the package entry point, while `showcase/` is the one-page site that
presents the components (its own `index.html`, `main.tsx` and assets) and imports the
library through `../src/index`.

`pnpm build` emits `dist/` — `index.js`, `index.css`, and the `.d.ts` tree. `package.json`
sets `"files": ["dist"]`, so a published tarball contains only `dist/`, `README.md` and
`package.json`; no site code or assets ever ship. Styles are opt-in through
`@xylitol/effects/style.css`.

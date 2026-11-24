# @xylitol0520/ui

A React component collection for expressive front-end effects.

[Showcase](https://xylitolcode.github.io/xylitol-ui/) · [Repository](https://github.com/xylitolcode/xylitol-ui) · [npm](https://www.npmjs.com/package/@xylitol0520/ui) · MIT

## HollowFlowText

Hollow outlined text with a continuously flowing multicolor outline. Moving the pointer across the
text reveals the gradient fill only near the pointer, with a feathered edge and a small amount of
follow-through.

```tsx
import { HollowFlowText } from '@xylitol0520/ui'
import '@xylitol0520/ui/style.css'

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
import { DirectionAwareSelection, SelectionTarget } from '@xylitol0520/ui'
import '@xylitol0520/ui/style.css'

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

## ScanText

A read head travels the line. Every glyph behind it keeps its full ink, every
glyph ahead of it stays a ghost, and the head itself is a hot edge that cools
back to ink along a trail. The head sits at `progress`, not at a point in time,
so the sentence doubles as a progress bar.

```tsx
import { ScanText } from '@xylitol0520/ui'
import '@xylitol0520/ui/style.css'

export function Status() {
  return (
    <ScanText state="streaming" progress={0.42} readout>
      Reading 1,284 tokens for collisions
    </ScanText>
  )
}
```

Five states cover the lifecycle. `pending` loops at `duration` seconds per pass
while something is thinking, `streaming` tracks `progress` and settles when the
value stops moving, `done` lets the head run off the end so the line simply
reads as text again, and `error` parks the head where it died and turns it red.
`idle` paints nothing, attaches no styles and never starts a frame.

| State | Read head | Trail |
| --- | --- | --- |
| `idle` | — | — |
| `pending` | loops left to right | steady |
| `streaming` | eases to `progress` | stretches with speed, collapses when it parks |
| `done` | exits past the last glyph | collapses to nothing |
| `error` | holds position, turns red | shortens |

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string` | required | Text the head travels across. |
| `state` | `'idle' \| 'pending' \| 'streaming' \| 'done' \| 'error'` | `'idle'` | Lifecycle of the scan. |
| `progress` | `number` | — | Head position from 0 to 1. Required for a determinate scan; omit it and `streaming` falls back to the loop. |
| `duration` | `number` | `2.8` | Seconds per pass in the indeterminate loop. |
| `color` | `string` | `#3074FE` | Accent the head is mixed from. |
| `tail` | `number` | `6` | Length of the cooling trail behind the head, in `em`. |
| `restOpacity` | `number` | `0.3` | Strength of the not-yet-read text. |
| `angle` | `number` | `10` | Tilt of the beam in degrees. |
| `caret` | `boolean` | `true` | Hairline needle on the head. Hidden automatically once the box wraps. |
| `readout` | `boolean` | `false` | Mono chip beside the text: the percentage, `scan`, `done` or `error`. |
| `as` | `ElementType` | `'span'` | Element used for the text. |
| `className` | `string` | — | Additional class name. |
| `style` | `CSSProperties` | — | Inline style and component CSS custom properties. |

The whole line is painted by a single gradient clipped to the glyphs, so no
letter is wrapped in a span and nothing is re-laid out — kerning, ligatures and
line breaks stay exactly as the font made them. Colours are mixed from
`currentColor`, which means the component inherits the surrounding text colour
and works on light and dark backgrounds without a theme prop. Style it through
the `--scan-*` custom properties.

`prefers-reduced-motion` freezes the head at its target and drops the needle
into place; a finished scan, an error and printed pages all fall back to plain
ink. The readout rides inside the line and opts back out of the clipped fill, so
it wraps with the text instead of starting a new box. Selection still works, but
the highlight paints behind transparent glyphs, so treat heavily-selected copy as
a poor fit for the effect.

## DitherButton

A pill whose surface is a field of cells. Light is not a gradient: a 4×4 Bayer
matrix decides which cells switch on, so the pointer halo arrives as rings of dots
that cross exact thresholds instead of fading like a haze. A scatter of sparks
rides on top, and pressing sends a ring outward that picks cells off as it passes.

```tsx
import { DitherButton } from '@xylitol0520/ui'
import '@xylitol0520/ui/style.css'

export function Install() {
  return (
    <DitherButton
      busyLabel="Copying"
      doneLabel="Copied"
      onAction={() => navigator.clipboard.writeText('pnpm add @xylitol0520/ui')}
    >
      Copy install command
    </DitherButton>
  )
}
```

The button never assumes what it is for. `onAction` does the work and the promise
decides the states: pending holds `busy`, settling lands on `done`, rejecting
returns to `idle`. `doneHold` decides how long the done label stays pinned — `0`
leaves it there until the next press. Without `onAction` the button still lights
up and still ripples; it just never leaves `idle`.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | Resting label. |
| `onAction` | `() => Promise<unknown> \| unknown` | — | Work run on press. The returned promise drives `busy` → `done` → `idle`. |
| `busyLabel` | `ReactNode` | `children` | Label while the action is pending. |
| `doneLabel` | `ReactNode` | `children` | Label once the action settles. |
| `doneHold` | `number` | `1600` | Milliseconds the done label stays pinned. `0` keeps it until the next press. |
| `color` | `string` | `#3074FE` | Accent the surface, the ring and the dust are mixed from. |
| `radius` | `number` | `68` | Radius of the pointer field, in pixels. |
| `cell` | `number` | `4` | Cell pitch in pixels; the seam is 1 px. Below 3 the gaps close. |
| `spark` | `number` | `0.18` | Sparks on top of the ordered field, `0` to `1`. `0` leaves a pure halftone. |
| `icon` | `ReactNode \| null` | dot mark | Trailing mark, swapped for a dotted check on `done`. `null` drops it. |
| `disabled` | `boolean` | `false` | Blocks the press and the spark field. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type. |
| `className` | `string` | — | Additional class name. |
| `style` | `CSSProperties` | — | Inline style and component CSS custom properties. |

The field is a canvas in the button's own box: cells are `cell` px on a 1 px seam,
the grid is centred so the unused sliver splits between the edges, and the device
pixel ratio is capped at 2 so a retina screen does not quadruple the work. Each
cell stores one threshold taken from the Bayer matrix plus a hair of jitter;
coverage above that threshold switches the cell on, and a lit cell paints the
alpha it was asked for, capped so even a dense halo still reads as separate dots.

The dust is the accent pulled 84% toward white, mixed once per render and reused
for every cell — which is why a single colour prop is enough and why the effect
holds on any surface. Sparks land on four brightness rungs, a 2-bit ramp, and
decay on one shared time constant, so the field settles instead of lingering. No
smooth gradient is ever drawn.

Style it through the `--dither-*` custom properties: `--dither-color`,
`--dither-ink`, `--dither-ring` and `--dither-success` (the mint the done state
borrows). The frame loop parks as soon as no cell is lit, nothing is hovered and
nothing is pending, so an idle button runs no frames at all.

`prefers-reduced-motion` drops sparks and ripples; the halo keeps painting, because
it is a still image rather than motion. Printed pages lose the canvas and keep a
plain key. The root is a real `<button>`, so focus, Enter and Space all work — a
keyboard press starts its ring at the centre, since there is no pointer to start
it from.

## Development

```bash
pnpm install
pnpm dev      # serves showcase/ at http://127.0.0.1:5173
pnpm check    # typecheck + build
pnpm build:site   # static build of showcase/ into dist-site/ (SITE_BASE=/repo/ for Pages)
```

The repository keeps the library and the site apart: `src/` is the library and
`src/index.ts` is the package entry point, while `showcase/` is the one-page site that
presents the components (its own `index.html`, `main.tsx` and assets) and imports the
library through `../src/index`.

`pnpm build` emits `dist/` — `index.js`, `index.css`, and the `.d.ts` tree. `package.json`
sets `"files": ["dist"]`, so a published tarball contains only `dist/`, `README.md` and
`package.json`; no site code or assets ever ship. Styles are opt-in through
`@xylitol0520/ui/style.css`.

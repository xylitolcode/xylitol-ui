import { getChapter } from '../registry'
import { Chapter } from '../ui/Chapter'
import { CopyButton } from '../ui/CopyButton'

const SNIPPET = `import { DirectionAwareSelection, SelectionTarget } from '@xylitol/effects'
import '@xylitol/effects/style.css'

export function Intro() {
  return (
    <DirectionAwareSelection color="#3074FE" fillColor="transparent">
      <p>
        Come at <SelectionTarget words="this word" hint="try it" /> from any side.
      </p>
    </DirectionAwareSelection>
  )
}`

const NOTES = [
  'No runtime dependencies',
  'TypeScript types included',
  'prefers-reduced-motion aware',
  'Keyboard focus paints the same frame',
]

export function InstallSection() {
  const chapter = getChapter('install')

  return (
    <Chapter {...chapter}>
      <div className="code" data-reveal>
        <div className="code__bar">
          <span className="code__file">Intro.tsx</span>
          <CopyButton value={SNIPPET} />
        </div>
        <pre className="code__body">
          <code>{SNIPPET}</code>
        </pre>
      </div>

      <ul className="notes" data-reveal>
        {NOTES.map((note) => (
          <li className="note" key={note}>
            {note}
          </li>
        ))}
      </ul>

      <p className="install-note" data-reveal>
        Styles are opt-in: import the stylesheet once at your app entry. Every other behaviour is a
        prop, and a target with no <code>href</code> and no <code>onSelect</code> stays inert text.
      </p>
    </Chapter>
  )
}

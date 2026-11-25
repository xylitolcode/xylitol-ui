import { getChapter } from '../registry'
import { useI18n } from '../i18n'
import { Chapter } from '../ui/Chapter'
import { CopyButton } from '../ui/CopyButton'

export function InstallSection() {
  const chapter = getChapter('install')
  const { copy } = useI18n()

  return (
    <Chapter {...chapter}>
      <div className="code" data-reveal>
        <div className="code__bar">
          <span className="code__file">Intro.tsx</span>
          <CopyButton value={copy.install.snippet} />
        </div>
        <pre className="code__body">
          <code>{copy.install.snippet}</code>
        </pre>
      </div>

      <ul className="notes" data-reveal>
        {copy.install.notes.map((note) => (
          <li className="note" key={note}>
            {note}
          </li>
        ))}
      </ul>

      <p className="install-note" data-reveal>
        {copy.install.noteBefore}
        <code>href</code>
        {copy.install.noteBetween}
        <code>onSelect</code>
        {copy.install.noteAfter}
      </p>
    </Chapter>
  )
}

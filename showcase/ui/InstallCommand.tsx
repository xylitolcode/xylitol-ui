import { CopyButton } from './CopyButton'

/** The install line, shaped like a terminal prompt so it reads as a command. */
export function InstallCommand({ command }: { command: string }) {
  return (
    <div className="install-line">
      <span className="install-line__prompt" aria-hidden="true">
        $
      </span>
      <code className="install-line__code">{command}</code>
      <CopyButton value={command} />
    </div>
  )
}

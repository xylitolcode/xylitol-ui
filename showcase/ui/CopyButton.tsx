import { useEffect, useRef, useState } from 'react'

import { useI18n } from '../i18n'

interface CopyButtonProps {
  value: string
  label?: string
}

/** Copies a string and flashes two states, nothing more. */
export function CopyButton({ value, label }: CopyButtonProps) {
  const { copy: t } = useI18n()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      return
    }

    setCopied(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button type="button" className="copy" onClick={copy} data-copied={copied || undefined}>
      {copied ? t.shell.copied : (label ?? t.shell.copy)}
    </button>
  )
}

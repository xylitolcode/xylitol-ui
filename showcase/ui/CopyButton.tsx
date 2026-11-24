import { useEffect, useRef, useState } from 'react'

interface CopyButtonProps {
  value: string
  label?: string
}

/** Copies a string and flashes two states, nothing more. */
export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
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
      {copied ? 'Copied' : label}
    </button>
  )
}

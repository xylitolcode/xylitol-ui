import { useEffect } from 'react'

/**
 * Reveals `[data-reveal]` blocks once they enter the viewport. Reduced-motion
 * users get the final state immediately, and so does anyone without
 * IntersectionObserver — the page must never depend on script to be readable.
 */
export function useReveal() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const calm =
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (calm) {
      for (const block of blocks) block.classList.add('is-in')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.14 },
    )

    for (const block of blocks) observer.observe(block)
    return () => observer.disconnect()
  }, [])
}

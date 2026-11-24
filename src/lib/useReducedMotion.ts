import { useEffect, useState } from 'react'

/**
 * Tracks `prefers-reduced-motion: reduce`. Returns false during SSR and on the
 * first client render, then settles to the real value on mount.
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

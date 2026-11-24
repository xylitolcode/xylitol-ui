import { useEffect, useState } from 'react'

/** Tracks which chapter owns the middle of the viewport, for the side rail. */
export function useScrollSpy(slugs: readonly string[]) {
  const [active, setActive] = useState(slugs[0] ?? '')

  useEffect(() => {
    const sections = slugs
      .map((slug) => document.getElementById(slug))
      .filter((element): element is HTMLElement => Boolean(element))

    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0.08, 0.4, 0.8] },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [slugs])

  return active
}

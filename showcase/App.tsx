import { CHAPTERS, CHAPTER_SLUGS } from './registry'
import { useReveal } from './lib/reveal'
import { useScrollSpy } from './lib/scrollSpy'
import { Hero } from './sections/Hero'
import { HollowSection } from './sections/HollowSection'
import { InstallSection } from './sections/InstallSection'
import { ScanSection } from './sections/ScanSection'
import { SelectionSection } from './sections/SelectionSection'
import { VariantsSection } from './sections/VariantsSection'

function TopBar() {
  return (
    <header className="topbar">
      <div className="shell topbar__inner">
        <a className="topbar__brand" href="#top">
          XYLITOL <span className="topbar__brand-dim">Effects</span>
        </a>
        <nav className="topbar__links" aria-label="Project links">
          <a href="https://github.com/xylitolcode/xylitol-ui">GitHub</a>
          <a href="https://www.npmjs.com/package/@xylitol0520/ui">npm</a>
        </nav>
      </div>
    </header>
  )
}

function ChapterRail({ active }: { active: string }) {
  return (
    <nav className="rail" aria-label="Chapters">
      {CHAPTERS.map((chapter) => (
        <a
          key={chapter.slug}
          className="rail__item"
          href={`#${chapter.slug}`}
          data-active={active === chapter.slug || undefined}
        >
          <span className="rail__index">{chapter.index}</span>
          <span className="rail__name">{chapter.name}</span>
        </a>
      ))}
    </nav>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <p className="footer__mark">XYLITOL Effects · v0.1.0</p>
        <nav className="footer__links" aria-label="Footer links">
          <a href="https://github.com/xylitolcode/xylitol-ui">GitHub</a>
          <a href="https://www.npmjs.com/package/@xylitol0520/ui">npm</a>
          <a href="#top">Back to top</a>
        </nav>
      </div>
    </footer>
  )
}

export function App() {
  useReveal()
  const active = useScrollSpy(CHAPTER_SLUGS)

  return (
    <div className="site">
      <TopBar />
      <Hero />
      <main className="chapters">
        <HollowSection />
        <SelectionSection />
        <ScanSection />
        <VariantsSection />
        <InstallSection />
      </main>
      <Footer />
      <ChapterRail active={active} />
    </div>
  )
}

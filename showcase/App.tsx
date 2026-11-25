import { CHAPTERS, CHAPTER_SLUGS } from './registry'
import { useI18n } from './i18n'
import { useReveal } from './lib/reveal'
import { useScrollSpy } from './lib/scrollSpy'
import { Hero } from './sections/Hero'
import { DitherSection } from './sections/DitherSection'
import { GhostSection } from './sections/GhostSection'
import { HollowSection } from './sections/HollowSection'
import { InstallSection } from './sections/InstallSection'
import { MendSection } from './sections/MendSection'
import { ScanSection } from './sections/ScanSection'
import { SelectionSection } from './sections/SelectionSection'
import { VariantsSection } from './sections/VariantsSection'

function TopBar() {
  const { locale, copy, setLocale } = useI18n()

  return (
    <header className="topbar">
      <div className="shell topbar__inner">
        <a className="topbar__brand" href="#top">
          XYLITOL <span className="topbar__brand-dim">{copy.shell.brandSuffix}</span>
        </a>
        <nav className="topbar__links" aria-label={copy.shell.projectLinks}>
          <a href="https://github.com/xylitolcode/xylitol-ui">GitHub</a>
          <a href="https://www.npmjs.com/package/@xylitol0520/ui">npm</a>
          <div className="locale-switch" role="group" aria-label={copy.shell.language}>
            <button
              type="button"
              className="locale-switch__option"
              data-active={locale === 'zh' || undefined}
              aria-pressed={locale === 'zh'}
              onClick={() => setLocale('zh')}
            >
              中
            </button>
            <button
              type="button"
              className="locale-switch__option"
              data-active={locale === 'en' || undefined}
              aria-pressed={locale === 'en'}
              onClick={() => setLocale('en')}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}

function ChapterRail({ active }: { active: string }) {
  const { copy } = useI18n()

  return (
    <nav className="rail" aria-label={copy.shell.chapters}>
      {CHAPTERS.map((chapter) => (
        <a
          key={chapter.slug}
          className="rail__item"
          href={`#${chapter.slug}`}
          data-active={active === chapter.slug || undefined}
        >
          <span className="rail__index">{chapter.index}</span>
          <span className="rail__name">
            {copy.chapterNames[chapter.slug as keyof typeof copy.chapterNames]}
          </span>
        </a>
      ))}
    </nav>
  )
}

function Footer() {
  const { copy } = useI18n()

  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <p className="footer__mark">XYLITOL Effects · v0.1.0</p>
        <nav className="footer__links" aria-label={copy.shell.footerLinks}>
          <a href="https://github.com/xylitolcode/xylitol-ui">GitHub</a>
          <a href="https://www.npmjs.com/package/@xylitol0520/ui">npm</a>
          <a href="#top">{copy.shell.backToTop}</a>
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
        <DitherSection />
        <MendSection />
        <GhostSection />
        <VariantsSection />
        <InstallSection />
      </main>
      <Footer />
      <ChapterRail active={active} />
    </div>
  )
}

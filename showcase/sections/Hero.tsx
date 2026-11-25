import { HollowFlowText } from '../../src/index'
import { useI18n } from '../i18n'
import { InstallCommand } from '../ui/InstallCommand'

export function Hero() {
  const { copy } = useI18n()

  return (
    <header className="hero" id="top">
      <div className="hero__halo" aria-hidden="true" />
      <div className="shell hero__inner">
        <p className="hero__eyebrow" data-reveal>
          <span>@xylitol0520/ui</span>
          <span className="hero__bullet" aria-hidden="true" />
          <span>React 18.2+</span>
        </p>

        <div className="hero__wordmark" data-reveal>
          <HollowFlowText
            ariaLabel={copy.hero.wordmarkAria}
            fontSize={168}
            fontWeight={800}
            letterSpacing="-0.045em"
          >
            {copy.hero.wordmark}
          </HollowFlowText>
        </div>

        <p className="hero__lede" data-reveal>
          {copy.hero.lede}
        </p>

        <div className="hero__actions" data-reveal>
          <InstallCommand command="pnpm add @xylitol0520/ui" />
          <a
            className="ghost-link"
            href="https://github.com/xylitolcode/xylitol-ui"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>

        <p className="hero__cue" data-reveal>
          <span className="hero__cue-arrow" aria-hidden="true">
            ↓
          </span>
          {copy.hero.cue}
        </p>
      </div>
    </header>
  )
}

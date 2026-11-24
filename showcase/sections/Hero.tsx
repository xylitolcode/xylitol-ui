import { HollowFlowText } from '../../src/index'
import { InstallCommand } from '../ui/InstallCommand'

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero__halo" aria-hidden="true" />
      <div className="shell hero__inner">
        <p className="hero__eyebrow" data-reveal>
          <span>@xylitol/ui</span>
          <span className="hero__bullet" aria-hidden="true" />
          <span>React 18.2+</span>
        </p>

        <div className="hero__wordmark" data-reveal>
          <HollowFlowText
            ariaLabel="Hello XYLITOL"
            fontSize={168}
            fontWeight={800}
            letterSpacing="-0.045em"
          >
            Hello XYLITOL
          </HollowFlowText>
        </div>

        <p className="hero__lede" data-reveal>
          Two effects for text that answers back. An outline that flows and only fills under your
          cursor, and a selection frame that knows which edge you came through.
        </p>

        <div className="hero__actions" data-reveal>
          <InstallCommand command="pnpm add @xylitol/ui" />
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
          Scroll — every effect below is live
        </p>
      </div>
    </header>
  )
}

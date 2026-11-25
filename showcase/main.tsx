import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { I18nProvider } from './i18n'
import './app.css'

// Reveal animations only arm themselves when script actually runs.
document.documentElement.classList.add('js')

createRoot(document.querySelector<HTMLDivElement>('#app')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

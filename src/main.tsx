import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

declare global {
  interface Window { __cpChaoTat?: () => void }
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

requestAnimationFrame(() => requestAnimationFrame(() => window.__cpChaoTat?.()))

navigator.storage?.persist?.().catch(() => {})

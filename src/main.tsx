import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

declare global {
  interface Window { __cpChaoTat?: () => void }
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

requestAnimationFrame(() => requestAnimationFrame(() => window.__cpChaoTat?.()))

navigator.storage?.persist?.().catch(() => {})

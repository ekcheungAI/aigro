import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initAuth } from '@/components/auth/member'

// Start Supabase auth listener (no-op when env missing → localStorage demo mode).
initAuth()

const root = document.getElementById('root')!
const normalizePath = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, '') : path
const currentUrl = `${normalizePath(window.location.pathname)}${window.location.search}`
const prerenderUrl = root.dataset.prerenderUrl
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// No StrictMode — it double-runs canvas/scroll effects (see react-dev.md).
// Hydrate only when the prerender explicitly identifies this URL; otherwise
// fall back to a normal client render for the Vite SPA shell.
if (root.hasChildNodes() && prerenderUrl === currentUrl) {
  hydrateRoot(root, app)
} else {
  if (root.hasChildNodes()) root.textContent = ''
  createRoot(root).render(app)
}

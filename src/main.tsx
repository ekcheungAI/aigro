import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initAuth } from '@/components/auth/member'

// Start Supabase auth listener (no-op when env missing → localStorage demo mode).
initAuth()

// No StrictMode — it double-runs canvas/scroll effects (see react-dev.md).
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)

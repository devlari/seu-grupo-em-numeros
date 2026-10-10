import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Só conta visitas, sem cookies. Nada da conversa passa por aqui (ver privacidade.html) */}
    <Analytics />
  </StrictMode>,
)

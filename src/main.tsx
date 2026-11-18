import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './store/themeStore'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error: unknown) => {
    console.warn('Loka Admin tidak dapat mengaktifkan akses offline.', error)
  })
}

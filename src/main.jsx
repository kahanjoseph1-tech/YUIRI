import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/lib/invoiceEmail'
import '@/index.css'

const buildVersion = 'email-module-cache-recovery-2026-07-28-1'

window.__YUIRI_BUILD_VERSION__ = buildVersion

try {
  if (localStorage.getItem('yuiri_build_version') !== buildVersion) {
    Object.keys(localStorage).forEach((key) => {
      if (/^(yuiri_|base44|mock|demo)/i.test(key)) {
        localStorage.removeItem(key)
      }
    })
    localStorage.setItem('yuiri_build_version', buildVersion)
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })
  }
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
  }
} catch {
  // Cache cleanup is best-effort and should never block the app.
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const reloadKey = 'yuiri_reload_after_stale_module'

  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, '1')
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

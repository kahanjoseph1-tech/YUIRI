import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const buildVersion = 'user-client-create-fix-2026-06-19-1'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

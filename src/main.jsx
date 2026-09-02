import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Remove any locally stored data from old versions.
// Data now always comes from Supabase — localStorage only keeps the session.
try { localStorage.removeItem('hfafa-data') } catch { /* ignore */ }

// The service worker must only run in production builds. In dev mode it caches
// Vite's dev assets and serves stale JS/CSS, making code changes look like
// they never appear even after saving and reloading.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
  } else {
    // Clean up any service worker / cache left over from a previous run so
    // dev mode always reflects the latest code.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
    }
  }
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)


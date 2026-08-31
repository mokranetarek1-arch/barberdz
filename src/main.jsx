import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Remove any locally stored data from old versions.
// Data now always comes from Supabase — localStorage only keeps the session.
try { localStorage.removeItem('hfafa-data') } catch { /* ignore */ }

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)


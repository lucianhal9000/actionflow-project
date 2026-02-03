import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ─── localStorage shim so the app works outside Claude ───
// The app originally uses window.storage (Claude-only).
// This shim maps it to localStorage so it works in any browser.
window.storage = {
  get: async (key) => {
    const val = localStorage.getItem(key);
    return val !== null ? { key, value: val } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  list: async (prefix = '') => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    return { keys, prefix };
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

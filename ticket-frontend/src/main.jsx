import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import './styles/dark-theme.css'
import { applyTheme, getSavedTheme } from './utils/theme'
import { API_BASE } from './utils/apiConfig'
import { clearAuthSession } from './utils/auth'

applyTheme(getSavedTheme())

// Automatically route API calls to backend live URL when VITE_API_URL is set
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('http://localhost:5000')) {
    config.url = config.url.replace('http://localhost:5000', API_BASE)
  }
  return config
})

// Global 401 Unauthorized Response Interceptor
// Detects expired or invalid tokens, wipes stale credentials, and cleanly redirects to login
let isRedirecting = false;
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthSession();
      const isAtLogin =
        window.location.pathname === '/' &&
        (!window.location.hash || window.location.hash === '#/' || window.location.hash.startsWith('#/?'));
      if (!isRedirecting && !isAtLogin) {
        isRedirecting = true;
        window.location.replace('/?sessionExpired=true');
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

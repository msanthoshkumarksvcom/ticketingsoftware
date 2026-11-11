import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import './styles/dark-theme.css'
import { applyTheme, getSavedTheme } from './utils/theme'
import { API_BASE } from './utils/apiConfig'

applyTheme(getSavedTheme())

// Automatically route API calls to backend live URL when VITE_API_URL is set
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('http://localhost:5000')) {
    config.url = config.url.replace('http://localhost:5000', API_BASE)
  }
  return config
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

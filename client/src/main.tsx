import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
// @ts-ignore
import { AuthProvider } from './context/AuthContext.jsx'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'

// Registro y actualización instantánea del Service Worker sin bloqueos de caché
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🔄 Actualización detectada en el servidor. Aplicando cambios...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('⚡ Sistema Americable listo.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  </StrictMode>,
)



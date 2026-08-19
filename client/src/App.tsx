import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
// @ts-ignore
import { useAuth } from './context/AuthContext';
// @ts-ignore
import Sidebar from './components/Sidebar';
// @ts-ignore
import Header from './components/Header';
// @ts-ignore
import MainMenu from './pages/MainMenu';
// @ts-ignore
import Inventory from './pages/Inventory';
// @ts-ignore
import InventoryHistory from './pages/InventoryHistory';
// @ts-ignore
import Users from './pages/Users';
// @ts-ignore
import Clients from './pages/Clients';
// @ts-ignore
import Billing from './pages/Billing';
// @ts-ignore
import Reports from './pages/Reports';
// @ts-ignore
import Invoices from './pages/Invoices';
// @ts-ignore
import Login from './pages/Login';
// @ts-ignore
import ClientMovements from './pages/ClientMovements';
import './index.css';

const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: '20vh' }}></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '3rem' }}>⛔</span>
      <h2 style={{ color: '#f87171', margin: 0 }}>Acceso Restringido</h2>
      <p style={{ color: '#94a3b8', margin: 0 }}>No tienes permisos para ver esta sección.</p>
    </div>
  );
  return children;
};

// --- Error Boundary (Antierrores) ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Global Error Boundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'white', background: '#0f172a', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '4rem' }}>🛰️</h1>
          <h2 style={{ marginBottom: '1rem' }}>Oops! Algo salió mal en el sistema.</h2>
          <p style={{ color: '#94a3b8', maxWidth: '500px' }}>Se ha detectado un error inesperado. Hemos registrado el incidente para solucionarlo.</p>
          <button onClick={() => window.location.href = '/'} className="btn-primary-glow" style={{ marginTop: '2rem', padding: '1rem 2rem' }}>Reiniciar Aplicación</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // ── Auto-Update Sentinel: Detecta actualizaciones y recarga automáticamente sin Shift + F5 ──
  React.useEffect(() => {
    let currentBootTime: string | null = null;
    let isChecking = false;

    const checkServerVersion = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.bootTime) {
            if (currentBootTime && currentBootTime !== data.bootTime) {
              console.log('🚀 Nueva actualización detectada en el servidor. Sincronizando interfaz automáticamente...');
              // Limpiar ServiceWorker caches para forzar assets nuevos
              if ('caches' in window) {
                try {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                } catch (e) { }
              }
              window.location.reload();
              return;
            }
            currentBootTime = data.bootTime;
          }
        }
      } catch (err) {
        // Red no disponible temporalmente
      } finally {
        isChecking = false;
      }
    };

    checkServerVersion();
    const interval = setInterval(checkServerVersion, 45000);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  if (location.pathname === '/login') {
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <ErrorBoundary>
      <div className="app-container">
        <div
          className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        <div className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </div>

        <div className="app-main">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />

          <main key={location.pathname} className="animate-page" style={{ flex: 1, position: 'relative' }}>
            <Routes>
              <Route path="/" element={<ProtectedRoute><MainMenu /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/inventory/history" element={<ProtectedRoute><InventoryHistory /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute roles={['admin', 'cajero']}><Invoices /></ProtectedRoute>} />
              <Route path="/movements" element={<ProtectedRoute><ClientMovements /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;


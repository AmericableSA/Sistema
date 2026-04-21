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

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { user } = useAuth();

  if (location.pathname === '/login') {
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
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
  );
}

export default App;


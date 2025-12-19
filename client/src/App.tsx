import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import Invoices from './pages/Invoices'; // NEW
// @ts-ignore
import Login from './pages/Login';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: '20vh' }}></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>⛔ Sin Permisos</div>;
  return children;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Full page login
  if (location.pathname === '/login') {
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  // Redirect to login if no user
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar with CSS Class Control */}
      <div className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
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
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

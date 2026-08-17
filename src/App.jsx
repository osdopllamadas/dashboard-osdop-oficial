import React, { Suspense, useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import './index.css';

const Login = React.lazy(() => import('./pages/Login'));
const RealTime = React.lazy(() => import('./pages/RealTime'));
const Minutes = React.lazy(() => import('./pages/Minutes'));
const Historial = React.lazy(() => import('./pages/Historial'));
const AIAnalyst = React.lazy(() => import('./pages/AIAnalyst'));
const LiveActivity = React.lazy(() => import('./pages/LiveActivity'));
const UsersManagement = React.lazy(() => import('./pages/UsersManagement'));
const AffiliatesCRM = React.lazy(() => import('./pages/AffiliatesCRM'));
const GeneralQueries = React.lazy(() => import('./pages/GeneralQueries'));

// Shared sidebar state so AppLayout and Sidebar stay in sync
export const SidebarContext = createContext({ collapsed: false, setCollapsed: () => {} });
export const useSidebar = () => useContext(SidebarContext);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', background: '#020714', padding: '2rem', minHeight: '100vh' }}>
          <h1 style={{ color: '#f87171' }}>⚠ Error de carga</h1>
          <pre style={{ color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Reiniciar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, requiredPath }) => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020714' }}>
        <div style={{ textAlign: 'center', color: '#60a5fa' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(96,165,250,0.2)', borderTop: '3px solid #60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Verificando sesión...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  
  if (requiredPath && user.permissions) {
    if (!user.permissions.includes(requiredPath)) {
        return <Navigate to="/" />;
    }
  }

  return children;
};

const AppLayout = ({ children }) => {
  const { collapsed, mobileOpen, setMobileOpen } = useContext(SidebarContext);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(2,7,20,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: 'clamp(1rem, 3vw, 2rem)',
          minWidth: 0,
          transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
          marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        }}
      >
        <style>{`
          @media (max-width: 1023px) {
            main { margin-left: 0 !important; padding-top: 4.5rem !important; }
          }
        `}</style>
        {children}
      </main>
    </div>
  );
};

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <CallProvider>
            <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
              <Suspense fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020714' }}>
                  <div style={{ textAlign: 'center', color: '#60a5fa' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(96,165,250,0.2)', borderTop: '3px solid #60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Cargando módulo...</p>
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              }>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<ProtectedRoute><AppLayout><LiveActivity /></AppLayout></ProtectedRoute>} />
                  <Route path="/tiempo-real" element={<ProtectedRoute requiredPath="/tiempo-real"><AppLayout><RealTime /></AppLayout></ProtectedRoute>} />
                  <Route path="/historial" element={<ProtectedRoute requiredPath="/historial"><AppLayout><Historial /></AppLayout></ProtectedRoute>} />
                  <Route path="/minutos" element={<ProtectedRoute requiredPath="/minutos"><AppLayout><Minutes /></AppLayout></ProtectedRoute>} />
                  <Route path="/analista-ia" element={<ProtectedRoute requiredPath="/analista-ia"><AppLayout><AIAnalyst /></AppLayout></ProtectedRoute>} />
                  <Route path="/usuarios" element={<ProtectedRoute requiredPath="/usuarios"><AppLayout><UsersManagement /></AppLayout></ProtectedRoute>} />
                  <Route path="/afiliados" element={<ProtectedRoute requiredPath="/afiliados"><AppLayout><AffiliatesCRM /></AppLayout></ProtectedRoute>} />
                  <Route path="/consultas" element={<ProtectedRoute requiredPath="/consultas"><AppLayout><GeneralQueries /></AppLayout></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </SidebarContext.Provider>
          </CallProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import RealTime from './pages/RealTime';
import Minutes from './pages/Minutes';
import Historial from './pages/Historial';
import AIAnalyst from './pages/AIAnalyst';
import LiveActivity from './pages/LiveActivity';
import UsersManagement from './pages/UsersManagement';
import AffiliatesCRM from './pages/AffiliatesCRM';
import GeneralQueries from './pages/GeneralQueries';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import './index.css';

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
        <div style={{ color: 'white', background: '#0f172a', padding: '2rem', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444' }}>⚠ Error de carga</h1>
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

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, authLoading } = useAuth();

  // While validating the stored token server-side, show a neutral loading screen
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#080b1a' }}>
        <div style={{ textAlign: 'center', color: '#60a5fa' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(96,165,250,0.2)', borderTop: '3px solid #60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Verificando sesión...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;

  return children;
};

const AppLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: '2rem',
        marginLeft: 'var(--sidebar-width)',
        transition: 'margin-left 0.3s ease'
      }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <CallProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout><RealTime /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/tiempo-real" element={
                <ProtectedRoute>
                  <AppLayout><LiveActivity /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/historial" element={
                <ProtectedRoute>
                  <AppLayout><Historial /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/consultas" element={
                <ProtectedRoute>
                  <AppLayout><GeneralQueries /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/minutos" element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <AppLayout><Minutes /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/analista-ia" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout><AIAnalyst /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/afiliados" element={
                <ProtectedRoute>
                  <AppLayout><AffiliatesCRM /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/usuarios" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout><UsersManagement /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </CallProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;

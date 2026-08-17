import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  History,
  Activity,
  PhoneCall,
  Clock,
  Brain,
  ChevronLeft,
  LayoutGrid,
  LogOut,
  Users,
  Shield,
  FolderSearch,
  Sparkles,
  X,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../App';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard General', icon: LayoutGrid, path: '/', section: 'MENÚ PRINCIPAL' },
    { name: 'CRM Afiliados', icon: Users, path: '/afiliados' },
    { name: 'Tiempo Real (Live)', icon: Activity, path: '/tiempo-real' },
    { name: 'Historial en Vivo', icon: History, path: '/historial' },
    { name: 'Consultas Generales', icon: FolderSearch, path: '/consultas' },
    { name: 'Minutos y Costos', icon: Clock, path: '/minutos' },
    { name: 'Gestión Usuarios', icon: Shield, path: '/usuarios', section: 'ADMINISTRACIÓN' },
    { name: 'Analista IA', icon: Brain, path: '/analista-ia', badge: 'Beta' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? '80px' : '260px';

  return (
    <>
      {/* ── Mobile Hamburger Button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(96, 165, 250, 0.15)',
          border: '1px solid rgba(96,165,250,0.25)',
          color: '#60a5fa',
          cursor: 'pointer',
        }}
        className="lg:hidden"
      >
        <Menu size={22} />
      </button>

      {/* ── Sidebar Panel ── */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 45,
          background: 'linear-gradient(180deg, #030b1a 0%, #020714 100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
          // On mobile: hide off-screen unless mobileOpen
          transform: undefined,
          overflow: 'hidden',
        }}
        className={cn(
          // On mobile: off-screen by default, slide in when mobileOpen
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // On desktop (lg+): always visible
          'lg:translate-x-0'
        )}
      >
        {/* Close button (mobile only) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4"
          style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', zIndex: 1 }}
        >
          <X size={20} />
        </button>

        {/* ── Logo / Brand ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '24px 16px 16px 16px',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(139,92,246,0.35)',
          }}>
            <PhoneCall size={19} fill="currentColor" />
          </div>

          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h1 style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}>
                RENTON CALL
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <Sparkles size={10} style={{ color: '#a78bfa' }} />
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Plataforma IA
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          padding: '0 10px',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {menuItems.map((item) => {
            // Permission check
            if (item.path !== '/' && user?.permissions && !user.permissions.includes(item.path)) return null;
            if (item.path === '/' && user?.permissions && !user.permissions.includes('/')) return null;

            return (
              <React.Fragment key={item.name}>
                {item.section && !collapsed && (
                  <div style={{
                    marginTop: '24px',
                    marginBottom: '6px',
                    paddingLeft: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}>
                    {item.section}
                  </div>
                )}

                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={handleNavClick}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '10px 0' : '10px 12px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    position: 'relative',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                    transition: 'background 0.2s, color 0.2s',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active left bar */}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '3px',
                          height: '22px',
                          background: '#818cf8',
                          borderRadius: '0 3px 3px 0',
                          boxShadow: '0 0 10px rgba(129,140,248,0.6)',
                        }} />
                      )}

                      {/* Icon */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: isActive ? '#818cf8' : '#94a3b8',
                        transition: 'all 0.2s',
                      }}>
                        <item.icon size={18} />
                      </div>

                      {/* Label */}
                      {!collapsed && (
                        <span style={{
                          fontSize: '13.5px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#e2e8f0' : '#94a3b8',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          transition: 'color 0.2s',
                        }}>
                          {item.name}
                        </span>
                      )}

                      {/* Badge */}
                      {!collapsed && item.badge && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '2px 7px',
                          borderRadius: '20px',
                          background: 'rgba(99,102,241,0.15)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.3)',
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </React.Fragment>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          margin: '12px',
          padding: '8px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="lg:flex hidden"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              width: '100%',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
          >
            <ChevronLeft size={17} style={{
              transition: 'transform 0.3s',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }} />
            {!collapsed && <span>Ocultar menú</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#f87171',
              width: '100%',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

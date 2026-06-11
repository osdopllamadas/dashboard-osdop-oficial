import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  History,
  BarChart2,
  BarChart3,
  Activity,
  PhoneCall,
  Clock,
  Brain,
  Globe,
  Settings,
  ChevronLeft,
  LayoutGrid,
  LogOut,
  Users,
  Shield,
  FolderSearch
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard General', icon: LayoutGrid, path: '/', section: 'MENU' },
    { name: 'CRM Afiliados', icon: Users, path: '/afiliados' },
    { name: 'Tiempo Real (Live)', icon: Activity, path: '/tiempo-real' },
    { name: 'Historial en Vivo', icon: History, path: '/historial' },
    { name: 'Consultas Generales', icon: FolderSearch, path: '/consultas' },
    { name: 'Minutos y Costos', icon: Clock, path: '/minutos', allowedRoles: ['admin', 'supervisor'] },
    { name: 'Gestión Usuarios', icon: Shield, path: '/usuarios', section: 'ADMINISTRACIÓN', allowedRoles: ['admin'] },
    { name: 'Analista IA', icon: Brain, path: '/analista-ia', allowedRoles: ['admin'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">
            <PhoneCall size={18} fill="currentColor" />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <h1>RENTON CALL APP</h1>
              <p>Plataforma de Inteligencia</p>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => {
          if (item.path !== '/' && user?.permissions && !user.permissions.includes(item.path)) return null;
          if (item.path === '/' && user?.permissions && !user.permissions.includes('/')) return null;

          return (
            <React.Fragment key={item.name}>
              {item.section && !collapsed && <div className="nav-section">{item.section}</div>}
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                end={item.path === '/'}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">

        <div className="nav-item" onClick={() => setCollapsed(!collapsed)}>
          <ChevronLeft size={20} className={collapsed ? 'rotate-180' : ''} />
          {!collapsed && <span>Colapsar</span>}
        </div>
        <div className="nav-item logout" onClick={handleLogout}>
          <LogOut size={20} />
          {!collapsed && <span>Cerrar Sesión</span>}
        </div>
      </div>

      <style jsx="true">{`
        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--bg-sidebar);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-color);
          transition: width 0.3s ease;
          overflow-y: auto;
          z-index: 100;
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed);
        }

        .sidebar-header {
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .logo-text h1 {
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .logo-text p {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 0.75rem;
        }

        .nav-section {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          margin: 1.5rem 0 0.5rem 0.75rem;
          letter-spacing: 1px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          margin-bottom: 4px;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          background-color: var(--bg-accent);
          color: var(--text-primary);
        }

        .nav-item.active {
          background-color: var(--bg-accent);
          color: var(--primary);
          border-right: 3px solid var(--primary);
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .lang-badge {
          font-size: 0.6rem;
          background: #334155;
          padding: 2px 4px;
          border-radius: 4px;
          margin-left: auto;
        }

        .rotate-180 {
          transform: rotate(180deg);
        }

        .logout {
          margin-top: 1rem;
          color: var(--error);
        }

        .logout:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;

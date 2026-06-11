import React, { useState, useEffect } from 'react';
import { Users, Phone, Clock, CheckCircle, XCircle, AlertCircle, Filter, ChevronDown, Activity, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AffiliatesCRM = () => {
  const { user, token } = useAuth();

  /**
   * Formatea el teléfono anteponiendo +549 de forma inteligente:
   * - Si ya tiene +549 → lo deja igual
   * - Si tiene +54 pero no +549 → agrega el 9
   * - Si empieza con 549 → agrega el +
   * - Si empieza con 54 → agrega +5 y el 9
   * - Si es solo número local (10 dígitos, empieza con 11,15,etc.) → antepone +549
   * - Cualquier otro caso → antepone +549
   */
  const formatPhone = (raw) => {
    if (!raw) return null;
    const cleaned = String(raw).replace(/\s+/g, '').replace(/-/g, '');
    if (cleaned.startsWith('+549')) return cleaned;
    if (cleaned.startsWith('+54')) return '+549' + cleaned.slice(3);
    if (cleaned.startsWith('549')) return '+' + cleaned;
    if (cleaned.startsWith('54')) return '+549' + cleaned.slice(2);
    return '+549' + cleaned;
  };
  const [affiliations, setAffiliations] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(''); // '' = all
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null); // id of the record being updated
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'incomplete'

  const loadData = async () => {
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const statusQuery = filterStatus ? `?status=${filterStatus}` : '';

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/affiliations${statusQuery}`, { headers }),
        fetch('/api/affiliations/stats', { headers })
      ]);

      if (listRes.ok) setAffiliations(await listRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error loading CRM data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const updateStatus = async (id, newStatus) => {
    setIsUpdatingStatus(id);
    try {
      const res = await fetch(`/api/affiliations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Error updating status');

      // Update local state smoothly
      setAffiliations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      loadData(); // Re-fetch stats in background
    } catch (err) {
      alert('Error al actualizar el estado.');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendiente': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', icon: <Clock size={14} /> };
      case 'contactado': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', icon: <CheckCircle size={14} /> };
      case 'descartado': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', icon: <XCircle size={14} /> };
      default: return { bg: 'rgba(255,255,255,0.1)', text: '#fff', icon: null };
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="header-row">
        <header className="page-header">
          <h1>LLAMADAS <span className="text-secondary-gradient">DE AFILIADOS EN TRAMITE</span></h1>
          <p>Gestión de leads y potenciales afiliaciones detectadas por IA.</p>
        </header>
        <div className="header-actions">
          <div className="filter-select-wrapper">
            <Filter size={16} className="filter-icon" />
            <select
              className="modern-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="pendiente">Solo Pendientes</option>
              <option value="contactado">Contactados</option>
              <option value="descartado">Descartados</option>
            </select>
            <ChevronDown size={14} className="dropdown-icon" />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card glass">
          <div className="kpi-icon gradient-1"><Users size={24} /></div>
          <div className="kpi-data">
            <h3>{stats ? stats.interested : 0}</h3>
            <p>Interesados Totales</p>
          </div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-icon gradient-2"><Clock size={24} /></div>
          <div className="kpi-data">
            <h3>{stats ? stats.pendiente : 0}</h3>
            <p>Pendientes de Contacto</p>
          </div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-icon gradient-3"><CheckCircle size={24} /></div>
          <div className="kpi-data">
            <h3>{stats ? stats.contactado : 0}</h3>
            <p>Contactados Exitosamente</p>
          </div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-icon gradient-4"><Activity size={24} /></div>
          <div className="kpi-data">
            <h3>{stats ? stats.total : 0}</h3>
            <p>Total Registros CRM</p>
          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="table-container-modern glass custom-scrollbar" style={{ marginTop: '2rem' }}>
        
        {/* TABS */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('new')}
            style={{ background: 'transparent', border: 'none', color: activeTab === 'new' ? '#3b82f6' : '#94a3b8', fontSize: '1rem', fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'new' ? '2px solid #3b82f6' : '2px solid transparent', transition: 'all 0.2s' }}
          >
            Nuevos Interesados
          </button>
          <button 
            onClick={() => setActiveTab('incomplete')}
            style={{ background: 'transparent', border: 'none', color: activeTab === 'incomplete' ? '#f59e0b' : '#94a3b8', fontSize: '1rem', fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'incomplete' ? '2px solid #f59e0b' : '2px solid transparent', transition: 'all 0.2s' }}
          >
            Altas Incompletas
          </button>
          <button 
            onClick={() => setActiveTab('existing')}
            style={{ background: 'transparent', border: 'none', color: activeTab === 'existing' ? '#10b981' : '#94a3b8', fontSize: '1rem', fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'existing' ? '2px solid #10b981' : '2px solid transparent', transition: 'all 0.2s' }}
          >
            Gestiones de Afiliados
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <RefreshCcw size={32} className="spin-icon" style={{ color: '#3b82f6', marginBottom: '1rem' }} />
            <p>Sincronizando CRM...</p>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre / Datos</th>
                <th>Teléfono</th>
                <th>Trámite</th>
                <th>Motivo Detectado</th>
                <th>Gestión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {affiliations.filter(aff => aff.affiliation_type === activeTab).length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay registros de afiliados en esta categoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                affiliations.filter(aff => aff.affiliation_type === activeTab).map(aff => {
                  const sColor = getStatusColor(aff.status);
                  const isMissing = aff.missing_info && aff.interested === 1;

                  return (
                    <tr key={aff.id}>
                      <td className="text-sm text-muted">
                        {new Date(aff.created_at).toLocaleDateString()}
                      </td>
                      <td className="fw-600">
                        {aff.nombre ? <div className="text-primary">{aff.nombre}</div> : <span className="text-muted text-sm">Sin nombre</span>}
                        {(aff.dni || aff.localidad) && (
                          <div className="text-sm text-muted" style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {aff.dni && <span> {aff.dni}</span>}
                            {aff.localidad && <span>📍 {aff.localidad}</span>}
                          </div>
                        )}
                      </td>
                      <td className="fw-600 text-primary">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={14} /> {formatPhone(aff.phone) || <span className="text-muted text-sm">Sin teléfono</span>}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{aff.tipo_tramite || <span className="text-muted">No especificado</span>}</span>
                      </td>
                      <td>
                        {aff.reason || <span className="text-muted">No especificado</span>}
                        {aff.motivo_finalizacion && (
                          <div className="text-sm text-muted" style={{ marginTop: '4px', fontStyle: 'italic' }}>
                            {aff.motivo_finalizacion}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge-status" style={{ background: sColor.bg, color: sColor.text }}>
                          {sColor.icon} <span style={{ textTransform: 'capitalize' }}>{aff.status}</span>
                        </span>
                      </td>
                      <td>
                        {isUpdatingStatus === aff.id ? (
                          <RefreshCcw size={16} className="spin-icon text-primary" />
                        ) : (
                          <select
                            className="status-changer"
                            value={aff.status}
                            onChange={(e) => updateStatus(aff.id, e.target.value)}
                          >
                            <option value="pendiente">Marcar Pendiente</option>
                            <option value="contactado">Marcar Contactado</option>
                            <option value="descartado">Descartar</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <style jsx="true">{`
        .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
        .text-secondary-gradient { background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        
        .filter-select-wrapper { position: relative; display: flex; align-items: center; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; overflow: hidden; transition: all 0.2s; }
        .filter-select-wrapper:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
        .filter-icon { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; }
        .dropdown-icon { position: absolute; right: 12px; color: var(--text-muted); pointer-events: none; }
        .modern-select { -webkit-appearance: none; background: transparent; border: none; color: white; padding: 10px 40px 10px 36px; font-size: 0.9rem; font-weight: 500; cursor: pointer; outline: none; }
        .modern-select option { background: #0f172a; color: white; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
        .kpi-card { padding: 1.5rem; border-radius: 16px; display: flex; align-items: center; gap: 1rem; border: 1px solid rgba(255, 255, 255, 0.05); }
        .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); flex-shrink: 0; }
        .gradient-1 { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
        .gradient-2 { background: linear-gradient(135deg, #f59e0b, #ef4444); }
        .gradient-3 { background: linear-gradient(135deg, #10b981, #059669); }
        .gradient-4 { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
        .kpi-data h3 { font-size: 1.75rem; font-weight: 700; color: white; margin-bottom: 4px; line-height: 1; }
        .kpi-data p { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
        
        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: var(--text-muted); }
        
        .table-container-modern { padding: 1rem; border-radius: var(--radius-lg); overflow-x: auto; background: rgba(20, 25, 45, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; padding: 1rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        .modern-table td { padding: 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        
        .fw-600 { font-weight: 600; }
        .text-muted { color: var(--text-muted); }
        .text-primary { color: #60a5fa; }
        .text-sm { font-size: 0.85rem; }
        
        .badge-interest { background: rgba(249, 115, 22, 0.15); color: #f97316; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
        .badge-missing { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: help; }
        .badge-status { padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        
        .status-changer { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); color: white; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; outline: none; transition: all 0.2s; }
        .status-changer:hover { border-color: #3b82f6; }
        .status-changer option { background: #0f172a; color: white; }
        
        .spin-icon { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AffiliatesCRM;

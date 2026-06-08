import React, { useState, useEffect } from 'react';
import { Shield, Users, Plus, Edit2, Trash2, X, RefreshCcw, Check, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UsersManagement = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'operator', status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Confirmation modal (replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState(null); // { id, username }

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/audit-logs', { headers })
      ]);
      
      if (!usersRes.ok || !logsRes.ok) throw new Error('Error al cargar datos de administración.');
      
      setUsers(await usersRes.json());
      setAuditLogs(await logsRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'operator', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({ username: u.username, password: '', role: u.role, status: u.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/users/${editingUser.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (isEdit && !payload.password) delete payload.password; // Don't send empty password on edit
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error en la operación.');
      }
      
      setIsModalOpen(false);
      loadData(); // Refresh both tables to update audit log automatically
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async (id, currentStatus) => {
    if (currentStatus === 'inactive') return;
    // Show inline confirmation modal instead of window.confirm
    const targetUser = users.find(u => u.id === id);
    setConfirmModal({ id, username: targetUser?.username || `#${id}` });
  };

  const confirmDisable = async () => {
    if (!confirmModal) return;
    const { id } = confirmModal;
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al deshabilitar el usuario.');
      }
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="header-row">
        <header className="page-header">
          <h1>Gestión de <span className="text-secondary-gradient">Usuarios</span></h1>
          <p>Control de accesos y auditoría de seguridad del sistema.</p>
        </header>
        <div className="header-actions">
          <button className="primary-btn" onClick={openCreateModal}>
            <Plus size={16} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <X size={18} /> {error}
        </div>
      )}

      {isLoading ? (
        <div className="initial-loading-container">
          <div className="spinner-large"></div>
          <p>Cargando información de usuarios y auditoría...</p>
        </div>
      ) : (
        <div className="admin-grid">
          {/* USERS TABLE */}
          <div className="admin-section">
            <div className="section-title">
              <Users size={18} />
              <h3>Usuarios del Sistema</h3>
            </div>
            <div className="table-container-modern glass custom-scrollbar">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={u.status === 'inactive' ? 'row-inactive' : ''}>
                      <td className="fw-600">{u.username}</td>
                      <td>
                        <span className={`badge-role role-${u.role}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'success' : 'error'}`}>
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn text-primary" onClick={() => openEditModal(u)} title="Editar Usuario">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn text-error" 
                            onClick={() => handleDisable(u.id, u.status)} 
                            disabled={u.status === 'inactive' || u.username === user.username}
                            title={u.username === user.username ? 'No puedes deshabilitarte a ti mismo' : 'Deshabilitar Usuario'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AUDIT LOG TABLE */}
          <div className="admin-section">
            <div className="section-title">
              <Shield size={18} className="text-secondary-gradient" />
              <h3>Registro de Auditoría (Audit Log)</h3>
            </div>
            <div className="table-container-modern glass custom-scrollbar" style={{ maxHeight: '400px' }}>
              <table className="modern-table audit-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Acción</th>
                    <th>Responsable</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="text-muted text-sm">
                        {new Date(log.created_at).toLocaleDateString()}{' '}
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className="badge-mini" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="fw-600 text-primary">{log.performed_by || 'Sistema'}</td>
                      <td className="text-sm truncate-cell" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No hay registros de auditoría aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content-card small-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
              <button className="close-btn-circle" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body custom-scrollbar">
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input 
                  type="text" 
                  className="modern-input" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>{editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="modern-input" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    required={!editingUser} 
                    minLength={6}
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Rol del Sistema</label>
                <select 
                  className="modern-input" 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="operator">Operator (Limitado)</option>
                  <option value="supervisor">Supervisor (Intermedio)</option>
                  <option value="admin">Admin (Acceso Total)</option>
                </select>
              </div>
              {editingUser && (
                <div className="form-group">
                  <label>Estado</label>
                  <select 
                    className="modern-input" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              )}
              <div className="modal-footer no-border">
                <button type="button" className="utility-btn" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? <RefreshCcw size={16} className="spin-icon" /> : <Save size={16} />}
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DISABLE MODAL — replaces window.confirm */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content-card small-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>⚠️ Confirmar acción</h2>
              <button className="close-btn-circle" onClick={() => setConfirmModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                ¿Estás seguro de que deseas <strong style={{ color: '#ef4444' }}>deshabilitar</strong> al usuario{' '}
                <strong style={{ color: 'white' }}>"{confirmModal.username}"</strong>?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                El usuario perderá acceso al sistema inmediatamente. Esta acción puede revertirse desde Editar Usuario.
              </p>
              <div className="modal-footer no-border">
                <button className="utility-btn" onClick={() => setConfirmModal(null)}>
                  Cancelar
                </button>
                <button
                  className="primary-btn"
                  onClick={confirmDisable}
                  style={{ background: '#ef4444', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
                >
                  <Trash2 size={15} /> Deshabilitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .text-secondary-gradient { background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .primary-btn { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; border: none; cursor: pointer; transition: all 0.2s ease; }
        .primary-btn:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .primary-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .error-banner { background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; color: #f87171; padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 12px; margin-bottom: 2rem; }
        
        .admin-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; }
        @media(min-width: 1200px) { .admin-grid { grid-template-columns: 1fr 1fr; } }
        
        .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; color: white; }
        .section-title h3 { font-size: 1.1rem; font-weight: 600; }
        
        .table-container-modern { padding: 1rem; border-radius: var(--radius-lg); overflow-x: auto; background: rgba(20, 25, 45, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; padding: 1rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        .modern-table td { padding: 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        
        .row-inactive td { opacity: 0.5; }
        .fw-600 { font-weight: 600; }
        .text-muted { color: var(--text-muted); }
        .text-primary { color: #60a5fa; }
        .text-error { color: #f87171; }
        .text-sm { font-size: 0.8rem; }
        
        .badge, .badge-mini { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        
        .badge-role { padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; }
        .role-admin { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .role-supervisor { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .role-operator { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        
        .action-buttons { display: flex; gap: 8px; }
        .icon-btn { background: rgba(255, 255, 255, 0.05); border: none; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .icon-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); transform: scale(1.05); }
        .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .truncate-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(2, 5, 18, 0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-content-card { background: #0a0d21; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
        .small-modal { width: 100%; max-width: 450px; }
        .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 600; color: white; }
        .close-btn-circle { background: rgba(255, 255, 255, 0.05); border: none; width: 36px; height: 36px; border-radius: 50%; color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .close-btn-circle:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        
        .modal-body { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .modern-input { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px 16px; border-radius: 10px; color: white; font-size: 0.95rem; outline: none; transition: all 0.2s; font-family: inherit; }
        .modern-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
        .modern-input option { background: #0f172a; color: white; }
        
        .modal-footer { padding-top: 1rem; display: flex; justify-content: flex-end; gap: 12px; }
        .utility-btn { background: rgba(255, 255, 255, 0.05); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .utility-btn:hover { background: rgba(255, 255, 255, 0.1); }
        
        .spin-icon { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default UsersManagement;

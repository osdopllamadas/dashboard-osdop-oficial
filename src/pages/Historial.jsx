import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ultravoxService } from '../services/ultravox';
import { Phone, Download, X, Play, Music, MessageSquare, Info, RefreshCcw } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import { useCalls } from '../context/CallContext';

const Historial = () => {
  const [selectedCall, setSelectedCall] = useState(null);
  const [filters, setFilters] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return {
      preset: 'Últimos 7 días',
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  });

  const { allCalls, isFetchingGlobal } = useCalls();

  const filteredCalls = useMemo(() => {
    if (!allCalls) return [];
    return allCalls.filter(call => {
      // Date filtering (Safeguard in case API returns more)
      if (filters.from && call.created < filters.from) return false;
      if (filters.to) {
        const toLimit = new Date(filters.to);
        toLimit.setDate(toLimit.getDate() + 1);
        const toLimitStr = toLimit.toISOString().split('T')[0];
        if (call.created >= toLimitStr) return false;
      }

      // Phone filter
      if (filters.phone && !call.customerPhoneNumber?.includes(filters.phone)) return false;

      // Min Duration filter
      const rawDur = call.billedDurationSeconds || call.billedDuration || 0;
      const durationVal = typeof rawDur === 'string' ? parseFloat(rawDur) : rawDur;
      if (filters.minSec && durationVal < filters.minSec) return false;

      // Status filter
      if (filters.status && filters.status !== 'Todos') {
        const isSuccess = ['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason);
        if (filters.status === 'Completada' && !isSuccess) return false;
        if (filters.status === 'Fallida' && isSuccess) return false;
      }

      return true;
    });
  }, [allCalls, filters]);

  const isLoading = isFetchingGlobal && filteredCalls.length === 0;

  const handleDownload = () => {
    // Función para escapar comas y comillas en el CSV
    const escapeCsv = (val) => {
      if (!val) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ["ID", "Teléfono", "Fecha", "Duración", "Resultado", "Resumen"].join(",");
    const rows = filteredCalls.map(c => [
      escapeCsv(c.callId),
      escapeCsv(c.customerPhoneNumber),
      escapeCsv(c.created),
      escapeCsv(`${c.billedDurationSeconds || c.billedDuration || 0}s`),
      escapeCsv(c.endReason),
      escapeCsv(c.summary || 'Sin detalle')
    ].join(",")).join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historial_filtrado_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="page-container">
      <div className="header-row">
        <header className="page-header">
          <h1>Historial de <span className="text-secondary-gradient">Llamadas</span></h1>
          <p>Registro completo de interacciones — {filteredCalls.length} resultados</p>
        </header>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isLoading && (
            <div className="loading-badge">
              <RefreshCcw size={14} className="spin-icon" /> Sincronizando...
            </div>
          )}
          <button className="download-btn" onClick={handleDownload} disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
            <Download size={16} /> Descargar CSV
          </button>
        </div>
      </div>

      <FilterBar onFilterChange={setFilters} resultsCount={filteredCalls.length} />

      <div className="table-container-modern glass">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Teléfono</th>
              <th>Fecha y Hora</th>
              <th>Duración</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.map(call => (

              <tr key={call.callId}>
                <td className="tel-cell clickable" onClick={() => setSelectedCall(call)}>
                  <div className="icon-circle"><Phone size={14} /></div>
                  {call.customerPhoneNumber || 'Oculto'}
                </td>
                <td>
                  <div className="dateTime">
                    <span className="date">{new Date(call.created).toLocaleDateString()}</span>
                    <span className="time">{new Date(call.created).toLocaleTimeString()}</span>
                  </div>
                </td>
                <td>
                  {/* Clean up duration (remove 's' if already present) */}
                  {(call.billedDurationSeconds || call.billedDuration || '0').toString().replace('s', '')}s
                </td>
                <td>
                  <span className={`badge ${['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason) ? 'success' : 'error'}`}>
                    {['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason) ? 'Completada' : 'Fallida'}
                  </span>
                </td>
                <td>
                  <button className="view-btn" onClick={() => setSelectedCall(call)}>Ver Detalle</button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {
        selectedCall && (
          <div className="modal-overlay" onClick={() => setSelectedCall(null)}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Detalle de Llamada</h2>
                  <p>{selectedCall.customerPhoneNumber || 'Oculto'}</p>
                </div>
                <button className="close-btn" onClick={() => setSelectedCall(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-section">
                  <div className="detail-title">
                    <Info size={16} /> Razon de la llamada
                  </div>
                  <p className="detail-text">
                    {selectedCall.endReason === 'normal' ? 'Llamada finalizada correctamente por el usuario.' :
                      selectedCall.endReason === 'agent_ended' ? 'Llamada finalizada por el agente.' :
                        `Llamada interrumpida: ${selectedCall.endReason}`}
                  </p>
                </div>

                <div className="detail-section">
                  <div className="detail-title">
                    <MessageSquare size={16} /> Resumen
                  </div>
                  <p className="detail-text summary">
                    {selectedCall.summary || 'No hay un resumen disponible para esta llamada.'}
                  </p>
                </div>

                {selectedCall.recordingUrl && (
                  <div className="detail-section audio-section">
                    <div className="detail-title">
                      <Music size={16} /> Grabación de Audio
                    </div>
                    <div className="audio-player-container">
                      <audio controls src={selectedCall.recordingUrl} className="custom-audio">
                        Tu navegador no soporta el elemento de audio.
                      </audio>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      <style jsx="true">{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .text-secondary-gradient {
          background: linear-gradient(135deg, #10b981, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .download-btn {
          background: var(--bg-accent);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }

        .table-container-modern {
          padding: 1rem;
          border-radius: var(--radius-lg);
          overflow-x: auto;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }

        .modern-table th {
          text-align: left;
          padding: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border-color);
        }

        .modern-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        }

        .tel-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
        }

        .tel-cell.clickable { cursor: pointer; color: var(--primary); }

        .icon-circle {
          width: 32px;
          height: 32px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .dateTime { display: flex; flex-direction: column; }
        .date { font-weight: 500; }
        .time { font-size: 0.75rem; color: var(--text-muted); }

        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .badge.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .view-btn {
          color: var(--primary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          width: 100%;
          max-width: 600px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          animation: modalSlide 0.3s ease-out;
        }

        @keyframes modalSlide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .modal-header h2 { font-size: 1.25rem; margin-bottom: 4px; }
        .modal-header p { font-size: 0.9rem; color: var(--text-muted); }

        .close-btn { color: var(--text-muted); transition: color 0.2s; }
        .close-btn:hover { color: white; }

        .modal-body { padding: 1.5rem; }

        .detail-section { margin-bottom: 1.5rem; }
        .detail-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .detail-text { font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); }
        .detail-text.summary { 
          background: rgba(255, 255, 255, 0.03); 
          padding: 1rem; 
          border-radius: 8px;
          border-left: 3px solid var(--primary);
        }

        .audio-player-container {
          margin-top: 1rem;
          background: rgba(0,0,0,0.2);
          padding: 1rem;
          border-radius: 12px;
        }

        .custom-audio {
          width: 100%;
          height: 40px;
        }
      `}</style>
    </div >
  );
};

export default Historial;

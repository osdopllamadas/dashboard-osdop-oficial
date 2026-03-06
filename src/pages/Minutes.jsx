import React, { useState, useMemo } from 'react';
import { ultravoxService } from '../services/ultravox';
import { Clock, DollarSign, TrendingUp, Download, Phone, RefreshCcw } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import { useCalls } from '../context/CallContext';

const Minutes = () => {
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
      if (filters.from && call.created < filters.from) return false;
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setDate(toDate.getDate() + 1);
        if (call.created >= toDate.toISOString().split('T')[0]) return false;
      }
      if (filters.status && filters.status !== 'Todos') {
        const ok = ['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason);
        if (filters.status === 'Completada' && !ok) return false;
        if (filters.status === 'Fallida' && ok) return false;
      }
      if (filters.phone && !call.customerPhoneNumber?.includes(filters.phone)) return false;
      const dur = typeof (call.billedDurationSeconds || call.billedDuration) === 'string'
        ? parseFloat(call.billedDurationSeconds || call.billedDuration)
        : (call.billedDurationSeconds || call.billedDuration || 0);
      if (filters.minSec && dur < filters.minSec) return false;
      return true;
    });
  }, [allCalls, filters]);

  const stats = useMemo(() => ultravoxService.getStats(filteredCalls), [filteredCalls]);
  const isLoading = isFetchingGlobal && filteredCalls.length === 0;

  const handleDownload = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["ID,Teléfono,Fecha,Minutos,Costo"].join(",") + "\n"
      + filteredCalls.map(c => [c.callId, c.customerPhoneNumber, c.created, (c.billedDuration / 60).toFixed(2), ((c.billedDuration / 60) * 0.065).toFixed(3)].join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_minutos.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="page-container">
      <div className="header-row">
        <header className="page-header">
          <h1>Análisis de <span className="text-primary-gradient">Minutos y Costos</span></h1>
          <p>Control detallado de consumo y facturación proyectada</p>
        </header>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isLoading && (
            <div className="loading-badge">
              <RefreshCcw size={14} className="spin-icon" /> Sincronizando...
            </div>
          )}
          <button className="download-btn-outline" onClick={handleDownload} disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
            <Download size={16} /> Exportar Reporte
          </button>
        </div>
      </div>

      <FilterBar onFilterChange={setFilters} resultsCount={filteredCalls.length} />

      <div className="stats-grid-small mb-4">
        <div className="stat-card glass">
          <div className="icon-rounded blue"><Clock size={20} /></div>
          <div className="stat-text">
            <span className="label">Minutos Totales</span>
            <span className="value">{stats.totalMinutes}m</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="icon-rounded green"><DollarSign size={20} /></div>
          <div className="stat-text">
            <span className="label">Costo Total</span>
            <span className="value">${stats.totalCost}</span>
            <span className="sub">Tasa: $0.065/min</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="icon-rounded orange"><TrendingUp size={20} /></div>
          <div className="stat-text">
            <span className="label">Promedio Duración</span>
            <span className="value">{stats.avgDuration}</span>
          </div>
        </div>
      </div>

      <div className="table-wrapper glass">
        <div className="table-header-custom">
          <h2>Desglose por Llamada</h2>
        </div>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Teléfono</th>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Minutos Fact.</th>
              <th>Costo Proyectado</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.map(call => {
              const durSeconds = parseFloat(call.billedDuration || 0);
              const durMinutes = durSeconds / 60;
              const cost = durMinutes * 0.065;

              return (
                <tr key={call.callId}>
                  <td className="tel-cell">
                    <Phone size={14} className="text-muted" />
                    {call.customerPhoneNumber || 'Oculto'}
                  </td>
                  <td>{new Date(call.created).toLocaleDateString()}</td>
                  <td>{durSeconds}s</td>
                  <td className="fact-min">{durMinutes.toFixed(2)}m</td>
                  <td className="cost-cell text-success">${cost.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx="true">{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .text-primary-gradient {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .download-btn-outline {
          background: transparent;
          border: 1px solid var(--primary);
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }

        .stats-grid-small {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .stat-card {
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .icon-rounded {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .icon-rounded.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .icon-rounded.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .icon-rounded.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

        .stat-text { display: flex; flex-direction: column; }
        .label { font-size: 0.8rem; color: var(--text-muted); }
        .value { font-size: 1.5rem; font-weight: 700; }
        .sub { font-size: 0.7rem; color: var(--text-muted); }

        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(-360deg); } }
        
        .loading-badge {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
        }

        .table-wrapper {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
        }

        .table-header-custom { margin-bottom: 1.5rem; }
        .table-header-custom h2 { font-size: 1.1rem; }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
        }

        .custom-table th {
          text-align: left;
          padding: 1rem;
          color: var(--text-muted);
          font-size: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .custom-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        }

        .tel-cell { display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .fact-min { color: var(--text-secondary); }
        .cost-cell { font-weight: 700; }
        .text-success { color: #10b981; }

        .mb-4 { margin-bottom: 2rem; }
      `}</style>
    </div>
  );
};

export default Minutes;

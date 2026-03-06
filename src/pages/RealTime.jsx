import React, { useState, useMemo } from 'react';
import { ultravoxService } from '../services/ultravox';
import {
  Phone, CheckCircle, AlertCircle, Clock, Activity, DollarSign, RefreshCcw
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer as RechartsResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area as RechartsArea
} from 'recharts';
import FilterBar from '../components/FilterBar';
import { useCalls } from '../context/CallContext';

const RealTime = () => {
  const { allCalls, isFetchingGlobal, hasError, filters, setFilters } = useCalls();

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

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

  const liveCalls = useMemo(() => {
    return filteredCalls.filter(c => !c.endReason && c.state !== 'ended' && c.state !== 'ended-no-recording');
  }, [filteredCalls]);

  const isLoadingInitial = isFetchingGlobal && allCalls.length === 0;

  const chartData = useMemo(() => {
    if (!filteredCalls.length) return [];
    const daily = {};
    filteredCalls.forEach(call => {
      const d = call.created.split('T')[0];
      if (!daily[d]) daily[d] = { date: d, calls: 0, minutes: 0 };
      daily[d].calls += 1;
      daily[d].minutes += (parseFloat(call.billedDurationSeconds || call.billedDuration || 0) / 60);
    });
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      minutes: parseFloat(d.minutes.toFixed(2))
    }));
  }, [filteredCalls]);

  return (
    <div className={`page-container animate-fade-in`}>
      <div className="header-row">
        <header className="page-header">
          <h1>Resumen <span className="text-secondary-gradient">Ejecutivo</span></h1>
          <p>Consolidado RENTON CALL APP — {stats.totalCalls} registros analizados</p>
        </header>
        <div className="header-actions">
          {isFetchingGlobal && (
            <div className="loading-badge">
              <RefreshCcw size={14} className="spin-icon" /> Sincronizando...
            </div>
          )}
          {hasError && (
            <div className="error-badge-light">
              <AlertCircle size={14} /> Error al cargar datos
            </div>
          )}
          <button className="refresh-btn-glass" onClick={() => window.location.reload()}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {isLoadingInitial ? (
        <div className="initial-loading-container">
          <div className="spinner-large"></div>
          <p>Sincronizando registros en tiempo real...</p>
        </div>
      ) : (
        <div className="content-fade-up">
          <div className="active-calls-hero glass">
            <div className="hero-content">
              <div className="pulse-container">
                <div className="pulse-ring"></div>
                <div className="pulse-dot"></div>
              </div>
              <div className="hero-text">
                <h3>Llamadas en Vivo</h3>
                <p>Actividad actual en tiempo real</p>
              </div>
            </div>
            <div className="hero-value">
              {liveCalls.length}
            </div>
          </div>

          {liveCalls.length > 0 && (
            <div className="live-calls-container animate-fade-in mb-4">
              <div className="section-header">
                <Activity size={16} className="text-blue" />
                <h4>Detalle de Llamadas Activas</h4>
              </div>
              <div className="live-calls-grid">
                {liveCalls.map(call => (
                  <div key={call.callId} className="live-call-card glass">
                    <div className="live-call-info">
                      <Phone size={14} className="text-blue" />
                      <span className="phone-number">{call.customerPhoneNumber}</span>
                    </div>
                    <div className="live-call-meta">
                      <span className="state-badge">{call.state}</span>
                      <span className="time-badge">{new Date(call.created).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <FilterBar onFilterChange={handleFilterChange} resultsCount={filteredCalls.length} filters={filters} />

          <div className="stats-row">
            <StatCard title="LLAMADAS TOTALES" value={stats.totalCalls} icon={<Phone />} color="blue" formula="Count(all)" />
            <StatCard title="LLAMADAS FALLIDAS" value={stats.failedCalls} icon={<AlertCircle />} color="red" formula="EndState != normal" />
            <StatCard title="MINUTOS FACTURADOS" value={stats.totalMinutes + 'm'} icon={<Activity />} color="purple" formula="Seconds / 60" />
            <StatCard title="COSTO TOTAL" value={`$${stats.totalCost}`} icon={<DollarSign />} color="cyan" formula="Minutos * 0.065" />
            <StatCard title="TASA ÉXITO" value={stats.successRate} icon={<CheckCircle />} color="green" formula="Success / Total" />
            <StatCard title="DURACIÓN PROM." value={stats.avgDuration} icon={<Clock />} color="orange" formula="TotalSec / Count" />
          </div>

          <div className="charts-container mt-4">
            <div className="chart-card glass">
              <div className="chart-info">
                <h3>Llamadas en el Tiempo</h3>
                <p>Volumen diario de llamadas</p>
              </div>
              <div className="chart-view">
                <RechartsResponsiveContainer width="100%" height={280}>
                  <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCallsReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <RechartsCartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <RechartsXAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <RechartsYAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    />
                    <RechartsArea type="monotone" dataKey="calls" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCallsReal)" strokeWidth={4} />
                  </RechartsAreaChart>
                </RechartsResponsiveContainer>
              </div>
            </div>

            <div className="chart-card glass">
              <div className="chart-info">
                <h3>Minutos Facturados por Día</h3>
                <p>Consumo de tiempo facturado diariamente</p>
              </div>
              <div className="chart-view">
                <RechartsResponsiveContainer width="100%" height={280}>
                  <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <RechartsCartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <RechartsXAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <RechartsYAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    />
                    <RechartsBar dataKey="minutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                  </RechartsBarChart>
                </RechartsResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .active-calls-hero {
          width: 280px;
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          margin-bottom: 2rem;
          border-left: 4px solid #3b82f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hero-text h3 { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 2px; }
        .hero-text p { font-size: 0.7rem; color: var(--text-muted); }

        .pulse-container {
          position: relative;
          width: 12px;
          height: 12px;
          margin-right: 12px;
        }

        .pulse-dot {
          width: 100%;
          height: 100%;
          background: #3b82f6;
          border-radius: 50%;
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .hero-value {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .live-calls-container {
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1rem;
        }

        .section-header h4 {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .live-calls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .live-call-card {
          padding: 1rem;
          border-radius: 12px;
          border-left: 3px solid var(--primary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
        }

        .live-call-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .phone-number {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .live-call-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .state-badge {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          font-weight: 600;
          text-transform: uppercase;
        }

        .time-badge {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1rem;
        }

        .charts-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .chart-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
        }

        .chart-info h3 { font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
        .chart-info p { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.5rem; }

        .text-blue { color: #3b82f6; }
        .mb-4 { margin-bottom: 2rem; }
        .mt-4 { margin-top: 2rem; }

        @media (max-width: 1400px) {
          .stats-row { grid-template-columns: repeat(3, 1fr); }
          .charts-container { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, sub, icon, color, formula }) => (
  <div className={`stat-card glass ${color}`}>
    <div className="stat-header">
      <div className="stat-icon">{icon}</div>
      <div className="stat-title-group">
        <h3>{title}</h3>
        {formula && <p className="stat-formula">{formula}</p>}
      </div>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-sub">{sub}</div>
    <style jsx="true">{`
      .stat-card {
        padding: 1.5rem;
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.3s ease;
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        min-height: 140px;
        position: relative;
        overflow: hidden;
      }
      .stat-card:hover { 
        transform: translateY(-5px);
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        margin-bottom: 1rem;
      }
      .stat-title-group h3 { 
        font-size: 0.75rem; 
        color: #94a3b8;
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-bottom: 4px; 
      }
      .stat-formula { 
        font-size: 0.6rem; 
        color: #64748b; 
        font-family: monospace; 
        opacity: 0.7; 
      }
      .stat-value { 
        font-size: 1.75rem; 
        font-weight: 700; 
        color: #f1f5f9;
        margin-top: auto;
      }
      .stat-sub { 
        font-size: 0.7rem; 
        color: #64748b;
        margin-top: 4px;
      }
      .stat-icon {
        padding: 8px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.03);
      }
      .stat-card.blue { border-top: 3px solid #3b82f6; }
      .stat-card.blue .stat-icon { color: #3b82f6; }
      .stat-card.red { border-top: 3px solid #ef4444; }
      .stat-card.red .stat-icon { color: #ef4444; }
      .stat-card.purple { border-top: 3px solid #8b5cf6; }
      .stat-card.purple .stat-icon { color: #8b5cf6; }
      .stat-card.cyan { border-top: 3px solid #06b6d4; }
      .stat-card.cyan .stat-icon { color: #06b6d4; }
      .stat-card.green { border-top: 3px solid #10b981; }
      .stat-card.green .stat-icon { color: #10b981; }
      .stat-card.orange { border-top: 3px solid #f59e0b; }
      .stat-card.orange .stat-icon { color: #f59e0b; }
    `}</style>
  </div>
);

export default RealTime;

import React, { useState, useMemo } from 'react';
import { ultravoxService } from '../services/ultravox';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { Phone, CheckCircle, AlertCircle, Clock, Activity, DollarSign, RefreshCcw } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import { useCalls } from '../context/CallContext';

const Analytics = () => {
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
    const chartData = useMemo(() => {
        if (!filteredCalls.length) return [];
        const daily = {};
        filteredCalls.forEach(call => {
            const d = call.created.split('T')[0];
            if (!daily[d]) daily[d] = { name: d, calls: 0 };
            daily[d].calls += 1;
        });
        return Object.values(daily).sort((a, b) => a.name.localeCompare(b.name)).map(d => ({
            ...d,
            name: new Date(d.name).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
        }));
    }, [filteredCalls]);

    const hourlyData = useMemo(() => {
        if (!filteredCalls.length) return [];
        const hours = {};
        filteredCalls.forEach(call => {
            const h = new Date(call.created).getHours();
            const hStr = `${h}:00`;
            if (!hours[hStr]) hours[hStr] = { name: hStr, calls: 0 };
            hours[hStr].calls += 1;
        });
        return Object.values(hours).sort((a, b) => parseInt(a.name) - parseInt(b.name));
    }, [filteredCalls]);

    return (
        <div className="page-container">
            <div className="header-row">
                <header className="page-header">
                    <h1>Analytics <span className="text-secondary-gradient">Avanzado</span></h1>
                    <p>Análisis detallado de métricas y tendencias</p>
                </header>
                <div className="header-actions">
                    {isLoading && (
                        <div className="loading-badge">
                            <RefreshCcw size={14} className="spin-icon" /> Sincronizando...
                        </div>
                    )}
                    <button className="refresh-btn-glass" onClick={() => window.location.reload()}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                </div>
            </div>

            <FilterBar onFilterChange={setFilters} resultsCount={filteredCalls.length} />

            <div className="stats-row">
                <StatCard title="Total Llamadas" value={stats.totalCalls} sub="Total filtrado" icon={<Phone />} color="blue" />
                <StatCard title="Tasa Éxito" value={stats.successRate} sub="Rendimiento" icon={<CheckCircle />} color="green" />
                <StatCard title="Fallidas" value={stats.failedCalls} sub="Errores detectados" icon={<AlertCircle />} color="red" />
                <StatCard title="Duración Prom." value={stats.avgDuration} sub="Por llamada" icon={<Clock />} color="orange" />
                <StatCard title="Minutos Totales" value={stats.totalMinutes} sub="Minutos facturados" icon={<Activity />} color="purple" />
                <StatCard title="Costo Total" value={`$${stats.totalCost}`} sub="Tasa $0.065/min" icon={<DollarSign />} color="cyan" />
            </div>

            <div className="charts-grid-main mt-4">
                <div className="chart-card glass">
                    <div className="chart-info">
                        <h3>Llamadas en el Tiempo</h3>
                        <p>Volumen diario de llamadas</p>
                    </div>
                    <div className="chart-box">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#areaGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card glass">
                    <div className="chart-info">
                        <h3>Actividad por Hora</h3>
                        <p>Horarios pico de llamadas</p>
                    </div>
                    <div className="chart-box">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                />
                                <Bar dataKey="calls" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

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

        .text-secondary-gradient {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1rem;
        }

        .charts-grid-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .chart-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
        }

        .chart-info {
           margin-bottom: 1.5rem;
        }

        .chart-info h3 { font-size: 1rem; font-weight: 600; }
        .chart-info p { font-size: 0.75rem; color: var(--text-muted); }

        .mt-4 { margin-top: 2rem; }

        @media (max-width: 1200px) {
          .stats-row { grid-template-columns: repeat(3, 1fr); }
          .charts-grid-main { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
};

const StatCard = ({ title, value, sub, icon, color }) => (
    <div className="stat-card glass">
        <div className="stat-content">
            <span className="stat-label-small">{title}</span>
            <span className="stat-value-large">{value}</span>
            <span className="stat-sub-xsmall">{sub}</span>
        </div>
        <div className={`icon-wrapper-sq ${color}`}>
            {icon}
        </div>
        <style jsx="true">{`
      .stat-card {
        padding: 1.25rem;
        border-radius: var(--radius-lg);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .stat-label-small { font-size: 0.75rem; color: var(--text-muted); display: block; }
      .stat-value-large { font-size: 1.75rem; font-weight: 700; display: block; margin: 4px 0; }
      .stat-sub-xsmall { font-size: 0.65rem; color: var(--text-muted); display: block; }
      
      .icon-wrapper-sq {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .blue { background: #3b82f6; }
      .green { background: #10b981; }
      .red { background: #ef4444; }
      .orange { background: #f59e0b; }
      .purple { background: #8b5cf6; }
      .cyan { background: #06b6d4; }
    `}</style>
    </div>
);

export default Analytics;

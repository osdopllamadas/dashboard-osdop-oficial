import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FolderSearch, CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const GeneralQueries = () => {
    const { token } = useAuth();
    const [data, setData] = useState({
        kpis: { total: 0, exitosas: 0, noExisten: 0 },
        chartData: [],
        recentQueries: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/consultas_generales`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Error al obtener consultas');
            const result = await res.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Consultas <span className="text-gradient">Generales</span></h1>
                <p>Monitoreo y análisis de las consultas realizadas por los afiliados.</p>
            </header>

            {error && (
                <div className="glass p-1 mb-2 br-md" style={{ color: '#ef4444', border: '1px solid #ef4444' }}>
                    Error: {error}
                </div>
            )}

            {/* KPIs */}
            <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass p-2 br-lg stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#94a3b8' }}>
                        <FolderSearch size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Consultas Totales</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f8fafc' }}>
                        {loading ? <RefreshCw className="spin-icon" size={24} /> : data.kpis.total}
                    </div>
                </div>

                <div className="glass p-2 br-lg stat-card" style={{ borderTop: '3px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981' }}>
                        <CheckCircle size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Realizadas con Éxito</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981' }}>
                        {loading ? <RefreshCw className="spin-icon" size={24} /> : data.kpis.exitosas}
                    </div>
                </div>

                <div className="glass p-2 br-lg stat-card" style={{ borderTop: '3px solid #ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#ef4444' }}>
                        <XCircle size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>No existen en BD de IA</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ef4444' }}>
                        {loading ? <RefreshCw className="spin-icon" size={24} /> : data.kpis.noExisten}
                    </div>
                </div>
            </div>

            {/* Chart and Table Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Chart */}
                <div className="glass p-2 br-lg">
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} className="text-primary" />
                        Tipos de Consultas
                    </h3>
                    <div style={{ height: '300px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw className="spin-icon text-muted" size={24} />
                            </div>
                        ) : data.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                No hay datos suficientes
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="glass p-2 br-lg">
                    <h3 style={{ marginBottom: '1rem' }}>Últimas Consultas Registradas</h3>
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="modern-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>Fecha</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>Afiliado</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>Tipo de Consulta</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}><RefreshCw className="spin-icon text-muted" /></td></tr>
                                ) : data.recentQueries.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No hay consultas registradas.</td></tr>
                                ) : (
                                    data.recentQueries.map((q) => (
                                        <tr key={q.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                                {new Date(q.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: '500', color: '#e2e8f0' }}>{q.nombre || 'Desconocido'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.telefono}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                    {q['tipo de consulta']}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ 
                                                    color: q['estado de la llamada']?.includes('Exitosa') ? '#10b981' : 
                                                           q['estado de la llamada']?.toLowerCase().includes('no exist') ? '#ef4444' : '#f59e0b' 
                                                }}>
                                                    {q['estado de la llamada']}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                .stat-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                }
            `}</style>
        </div>
    );
};

export default GeneralQueries;

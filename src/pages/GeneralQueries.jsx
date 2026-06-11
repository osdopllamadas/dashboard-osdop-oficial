import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FolderSearch, CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3000');
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const GeneralQueries = () => {
    const { token } = useAuth();
    const [data, setData] = useState({
        kpis: { total: 0, exitosas: 0, noExisten: 0 },
        chartData: [],
        recentQueries: [],
        unresolvedQueries: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCategoryClick = (categoryName) => {
        if (!categoryName) return;
        setSelectedCategory(categoryName);
        setIsModalOpen(true);
    };

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
            <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
                <div className="futuristic-card">
                    <div className="glow-bar" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 15px #3b82f6' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px' }}>
                            <FolderSearch size={20} color="#3b82f6" />
                        </div>
                        <span className="kpi-title">Consultas Totales</span>
                    </div>
                    <div className="kpi-value">
                        {loading ? <RefreshCw className="spin-icon" size={32} /> : data.kpis.total}
                    </div>
                </div>

                <div className="futuristic-card">
                    <div className="glow-bar" style={{ background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 0 15px #10b981' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
                            <CheckCircle size={20} color="#10b981" />
                        </div>
                        <span className="kpi-title">Realizadas con Éxito</span>
                    </div>
                    <div className="kpi-value">
                        {loading ? <RefreshCw className="spin-icon" size={32} /> : data.kpis.exitosas}
                    </div>
                </div>

                <div className="futuristic-card">
                    <div className="glow-bar" style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow: '0 0 15px #f59e0b' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
                            <Activity size={20} color="#f59e0b" />
                        </div>
                        <span className="kpi-title">Llamadas Fallidas</span>
                    </div>
                    <div className="kpi-value">
                        {loading ? <RefreshCw className="spin-icon" size={32} /> : (data.kpis.fallidas || 0)}
                    </div>
                </div>

                <div className="futuristic-card">
                    <div className="glow-bar" style={{ background: 'linear-gradient(90deg, #ef4444, #b91c1c)', boxShadow: '0 0 15px #ef4444' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                            <XCircle size={20} color="#ef4444" />
                        </div>
                        <span className="kpi-title">No existen en BD</span>
                    </div>
                    <div className="kpi-value">
                        {loading ? <RefreshCw className="spin-icon" size={32} /> : data.kpis.noExisten}
                    </div>
                </div>
            </div>

            {/* Chart and Table Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2.5rem' }}>
                {/* Chart */}
                <div className="futuristic-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '700' }}>
                        <Activity size={22} className="text-primary" />
                        Tipos de Consultas
                    </h3>
                    <div style={{ height: '420px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw className="spin-icon text-muted" size={24} />
                            </div>
                        ) : data.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.chartData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={75}
                                        outerRadius={105}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="rgba(0,0,0,0.2)"
                                        strokeWidth={2}
                                    >
                                        {data.chartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={COLORS[index % COLORS.length]} 
                                                style={{ filter: `drop-shadow(0px 4px 6px ${COLORS[index % COLORS.length]}40)`, cursor: 'pointer' }}
                                                onClick={() => handleCategoryClick(entry.name)}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#e2e8f0', fontWeight: '500' }}
                                    />
                                    <Legend 
                                        content={(props) => {
                                            const { payload } = props;
                                            return (
                                                <ul style={{ listStyle: 'none', padding: '0', margin: 0, maxHeight: '160px', overflowY: 'auto', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }} className="custom-scroll">
                                                    {payload.map((entry, index) => (
                                                        <li 
                                                            key={`item-${index}`} 
                                                            style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', padding: '6px', borderRadius: '6px', transition: 'background 0.2s', cursor: 'pointer' }} 
                                                            className="legend-item hover-bg"
                                                            onClick={() => handleCategoryClick(entry.value)}
                                                        >
                                                            <span style={{ width: '12px', height: '12px', backgroundColor: entry.color, borderRadius: '50%', marginRight: '10px', flexShrink: 0, boxShadow: `0 0 8px ${entry.color}` }}></span>
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500', flexGrow: 1 }} title={entry.value}>
                                                                {entry.value}
                                                            </span>
                                                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '10px' }}>
                                                                {entry.payload.value}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        }}
                                        layout="horizontal" 
                                        verticalAlign="bottom" 
                                        align="center"
                                        wrapperStyle={{ paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                No hay datos suficientes
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="futuristic-card">
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '700' }}>Últimas Consultas Registradas</h3>
                    <div className="table-responsive custom-scroll" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                        <table className="modern-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Afiliado</th>
                                    <th>Tipo de Consulta</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}><RefreshCw className="spin-icon text-muted" size={32} /></td></tr>
                                ) : data.recentQueries.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No hay consultas registradas.</td></tr>
                                ) : (
                                    data.recentQueries.map((q) => (
                                        <tr key={q.id}>
                                            <td style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>
                                                {new Date(q.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '600', color: '#f8fafc' }}>{q.nombre || 'Desconocido'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{q.telefono}</div>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                                                    {q.tipoAgrupado || q['motivo de consulta'] || q['tipo de consulta'] || 'Sin clasificar'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ 
                                                    background: q['estado de la llamada']?.includes('Exitosa') ? 'rgba(16,185,129,0.15)' : 
                                                                q['estado de la llamada']?.toLowerCase().includes('no exist') ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                    color: q['estado de la llamada']?.includes('Exitosa') ? '#34d399' : 
                                                           q['estado de la llamada']?.toLowerCase().includes('no exist') ? '#f87171' : '#fbbf24',
                                                    border: `1px solid ${q['estado de la llamada']?.includes('Exitosa') ? 'rgba(16,185,129,0.3)' : 
                                                            q['estado de la llamada']?.toLowerCase().includes('no exist') ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
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

            {/* Unresolved Queries Section */}
            <div className="futuristic-card" style={{ marginTop: '2.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <XCircle size={22} color="#ef4444" />
                    Consultas No Resueltas por Falta de Base de Conocimientos
                </h3>
                <div className="table-responsive custom-scroll" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                    <table className="modern-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Afiliado</th>
                                <th>Motivo de Finalización</th>
                                <th>Resumen / Contexto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}><RefreshCw className="spin-icon text-muted" size={32} /></td></tr>
                            ) : (!data.unresolvedQueries || data.unresolvedQueries.length === 0) ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No hay consultas sin resolver por este motivo.</td></tr>
                            ) : (
                                data.unresolvedQueries.map((q) => (
                                    <tr key={q.id}>
                                        <td style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500', width: '120px' }}>
                                            {new Date(q.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ width: '200px' }}>
                                            <div style={{ fontWeight: '600', color: '#f8fafc' }}>{q.nombre || 'Desconocido'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{q.telefono}</div>
                                        </td>
                                        <td style={{ width: '250px' }}>
                                            <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'normal', display: 'inline-block', textAlign: 'center' }}>
                                                {q['motivo de finalizacion'] || 'Desconocido'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                {q['resumen de llamada'] || q.summary || 'No hay resumen disponible para esta llamada.'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalles de Categoría */}
            {isModalOpen && selectedCategory && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="futuristic-card" style={{ width: '90%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FolderSearch className="text-primary" />
                                Detalles: {selectedCategory}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <XCircle size={28} />
                            </button>
                        </div>
                        
                        <div className="table-responsive custom-scroll" style={{ overflowY: 'auto', flexGrow: 1 }}>
                            <table className="modern-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Lead / Teléfono</th>
                                        <th>Resumen de la Consulta</th>
                                        <th>Estado Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentQueries.filter(q => q.tipoAgrupado === selectedCategory).length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay registros específicos para esta categoría.</td></tr>
                                    ) : (
                                        data.recentQueries.filter(q => q.tipoAgrupado === selectedCategory).map((q) => (
                                            <tr key={q.id}>
                                                <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(q.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold' }}>{q.nombre || 'Desconocido'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{q.telefono}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>{q['motivo de consulta'] || 'Sin motivo específico'}</div>
                                                    {q['motivo de finalizacion'] && (
                                                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#94a3b8' }}>
                                                            {q['motivo de finalizacion']}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ 
                                                        background: q['estado de la llamada']?.includes('Exitosa') ? 'rgba(16,185,129,0.15)' : 
                                                                    q['estado de la llamada']?.toLowerCase().includes('no exist') ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                        color: q['estado de la llamada']?.includes('Exitosa') ? '#34d399' : 
                                                               q['estado de la llamada']?.toLowerCase().includes('no exist') ? '#f87171' : '#fbbf24'
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
            )}

            <style jsx="true">{`
                .futuristic-card {
                    position: relative;
                    background: rgba(16, 20, 45, 0.4);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                    overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                }
                .futuristic-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
                }
                .glow-bar {
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 3px;
                }
                .kpi-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                .kpi-value {
                    font-size: 3.2rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #fff, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-top: 0.5rem;
                }
                .modern-table th {
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.1em;
                    color: #64748b;
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .modern-table td {
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.02);
                }
                .modern-table tr {
                    transition: all 0.3s ease;
                }
                .modern-table tbody tr:hover {
                    background: rgba(255,255,255,0.03);
                    transform: translateX(4px);
                }
                .badge {
                    padding: 0.35rem 0.85rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: inline-block;
                }
                .legend-item:hover {
                    background: rgba(255,255,255,0.05);
                }
                .custom-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255,255,255,0.2);
                }
            `}</style>
        </div>
    );
};

export default GeneralQueries;

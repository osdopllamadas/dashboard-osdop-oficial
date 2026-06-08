import React, { useState, useEffect } from 'react';
import { Brain, Zap, MessageSquare, Lightbulb, ShieldCheck, Target, RefreshCw, CheckCircle, AlertTriangle, Activity, Clock, PhoneOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AIAnalyst = () => {
    const { token } = useAuth();
    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
    const [apiKey, setApiKey] = useState('');
    const [timeRange, setTimeRange] = useState('7');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [analyses, setAnalyses] = useState([]);
    const [healthScore, setHealthScore] = useState(null);
    const [resolutionRate, setResolutionRate] = useState(null);
    const [interruptionRate, setInterruptionRate] = useState(null);
    const [avgDurationSecs, setAvgDurationSecs] = useState(null);
    const [trend, setTrend] = useState('');
    const [error, setError] = useState(null);

    const handleAnalyze = async () => {
        if (!apiKey.trim()) {
            setError('Por favor, ingresa tu API Key para ejecutar el análisis.');
            return;
        }

        setIsAnalyzing(true);
        setAnalyzed(false);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/ai/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ model: selectedModel, timeRange, apiKey })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error del servidor: ${res.status}`);
            }

            const data = await res.json();
            setAnalyses(data.analyses || []);
            setHealthScore(data.agentHealthScore ?? null);
            setResolutionRate(data.resolutionRate ?? null);
            setInterruptionRate(data.interruptionRate ?? null);
            setAvgDurationSecs(data.avgDurationSecs ?? null);
            setTrend(data.trend || '');
            setAnalyzed(true);
        } catch (err) {
            setError(err.message || 'Error de conexión con el servidor de análisis.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Analista <span className="text-ai-gradient">IA Estratégico</span></h1>
                <p>Optimización avanzada del agente de voz mediante Inteligencia Artificial</p>
            </header>

            <div className="admin-dashboard-grid mb-4">
                <div className="glass p-1-5 br-lg col-span-2">
                    <div className="section-title">
                        <ShieldCheck size={20} className="text-primary" />
                        <h3>Motor de Análisis</h3>
                    </div>
                    <div className="config-form-horizontal">
                        <div className="input-group-flex">
                            <label>Modelo de Análisis</label>
                            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="modern-select">
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Velocidad)</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Precisión)</option>
                                <option value="gpt-4o">OpenAI GPT-4o (Premium)</option>
                                <option value="claude-3-haiku-20240307">Anthropic Claude 3 Haiku</option>
                                <option value="claude-3-5-sonnet-20240620">Anthropic Claude 3.5 Sonnet</option>
                            </select>
                        </div>
                        <div className="input-group-flex">
                            <label>Rango de Tiempo</label>
                            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="modern-select">
                                <option value="7">Últimos 7 días</option>
                                <option value="15">Últimos 15 días</option>
                                <option value="30">Últimos 30 días</option>
                                <option value="all">Todo el historial</option>
                            </select>
                        </div>
                        <div className="input-group-flex" style={{ flex: 1.5 }}>
                            <label>API Key (No se guardará)</label>
                            <input 
                                type="password" 
                                value={apiKey} 
                                onChange={(e) => setApiKey(e.target.value)} 
                                placeholder={selectedModel.includes('gemini') ? 'AIzaSy...' : selectedModel.includes('gpt') ? 'sk-...' : 'sk-ant-...'}
                                className="modern-select" 
                                style={{ cursor: 'text' }}
                            />
                        </div>
                        <button className="btn-primary-glow" onClick={handleAnalyze} disabled={isAnalyzing}>
                            {isAnalyzing ? <RefreshCw size={18} className="spin-icon" /> : <Zap size={18} />}
                            {isAnalyzing ? 'Analizando...' : 'Ejecutar Análisis'}
                        </button>
                    </div>
                </div>

                <div className="glass p-1-5 br-lg">
                    <div className="section-title">
                        <Target size={20} className="text-warning" />
                        <h3>KPIs Estratégicos</h3>
                    </div>
                    <div className="kpi-grid">
                        <div className="kpi-mini-card">
                            <div className="kpi-header">
                                <Activity size={14} className="text-primary" />
                                <span>Salud General</span>
                            </div>
                            <div className="kpi-value" style={{ color: healthScore >= 75 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                                {healthScore !== null ? `${healthScore}` : '—'}
                            </div>
                        </div>

                        <div className="kpi-mini-card">
                            <div className="kpi-header">
                                <CheckCircle size={14} className="text-success" />
                                <span>Resolución</span>
                            </div>
                            <div className="kpi-value" style={{ color: resolutionRate >= 70 ? '#10b981' : '#f59e0b' }}>
                                {resolutionRate !== null ? `${resolutionRate}%` : '—'}
                            </div>
                        </div>

                        <div className="kpi-mini-card">
                            <div className="kpi-header">
                                <PhoneOff size={14} className="text-danger" />
                                <span>Interrupción</span>
                            </div>
                            <div className="kpi-value" style={{ color: interruptionRate > 20 ? '#ef4444' : '#10b981' }}>
                                {interruptionRate !== null ? `${interruptionRate}%` : '—'}
                            </div>
                        </div>

                        <div className="kpi-mini-card">
                            <div className="kpi-header">
                                <Clock size={14} className="text-warning" />
                                <span>Duración Prom.</span>
                            </div>
                            <div className="kpi-value text-default">
                                {avgDurationSecs !== null ? `${avgDurationSecs}s` : '—'}
                            </div>
                        </div>
                    </div>
                    {trend && <div className="trend-up" style={{ textAlign: 'center', marginTop: '1rem' }}>{trend}</div>}
                </div>
            </div>

            <div className="analysis-section glass p-2 br-lg">
                <div className="analysis-header mb-2">
                    <div className="title-wrap">
                        <Zap size={24} className="text-warning-glow" />
                        <h2>Sugerencias de Optimización Automática</h2>
                    </div>
                    {analyzed && (
                        <div className="success-pill">
                            <CheckCircle size={14} />
                            Análisis completado
                        </div>
                    )}
                </div>

                <div className="optimization-list">
                    {error && (
                        <div className="error-banner">
                            <AlertTriangle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {!analyzed && !isAnalyzing && !error && (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#64748b' }}>
                            <Brain size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '0.9rem' }}>Presiona "Ejecutar Análisis" para obtener insights estratégicos en tiempo real.</p>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#475569' }}>
                                Se analizarán las métricas acumuladas en la base de datos local (llamadas, duración, resolución, cobertura).
                            </p>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#a855f7' }}>
                            <div className="analyzing-spinner">
                                <Brain size={40} style={{ opacity: 0.6 }} />
                            </div>
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Procesando métricas de llamadas...</p>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#64748b' }}>Calculando tasas de resolución, empatía y claridad.</p>
                        </div>
                    )}

                    {analyzed && analyses.map(item => (
                        <div key={item.id} className="optimization-item">
                            <div className="item-left">
                                <div className="category-tag">{item.category}</div>
                                <div className="impact-badge" data-impact={item.impact}>
                                    Impacto: {item.impact}
                                </div>
                            </div>
                            <div className="item-content">
                                <div className="obs-wrap">
                                    <MessageSquare size={16} className="text-muted" />
                                    <p>{item.observation}</p>
                                </div>
                                <div className="suggest-wrap">
                                    <Lightbulb size={16} className="text-warning" />
                                    <p><strong>Mejora sugerida:</strong> {item.improvement}</p>
                                </div>
                                {item.evidence && (
                                    <div className="evidence-wrap" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                                            <strong style={{ color: '#cbd5e1' }}>Evidencia (Llamadas reales):</strong> "{item.evidence}"
                                        </p>
                                    </div>
                                )}
                                <div style={{ marginTop: '1rem' }}>
                                    <button 
                                        onClick={() => alert(`Simulando aplicación de mejora en Ultravox API...\nCambio a realizar: ${item.improvement}`)} 
                                        className="btn-primary-glow" 
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'fit-content', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                    >
                                        <Zap size={14} /> Aplicar Mejora
                                    </button>
                                </div>
                            </div>
                            <div className="item-right">
                                <div className="circular-score" style={{ '--percent': item.score }}>
                                    <span>{item.score}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx="true">{`
        .text-ai-gradient {
          background: linear-gradient(135deg, #a855f7, #6366f1);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
          color: var(--text-secondary);
        }

        .config-form-horizontal {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .input-group-flex {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-width: 180px;
        }

        .input-group-flex label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }

        .modern-select {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: white;
          width: 100%;
          cursor: pointer;
        }

        .modern-select option {
          background: #0f172a;
          color: white;
        }

        .secure-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 0.5rem 0.85rem;
          border-radius: 20px;
          white-space: nowrap;
        }

        .btn-primary-glow {
          background: var(--primary);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
          white-space: nowrap;
          cursor: pointer;
          border: none;
          transition: opacity 0.2s;
        }

        .btn-primary-glow:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin-icon {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .kpi-mini-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .kpi-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .kpi-value {
          font-size: 1.5rem;
          font-weight: 800;
        }
        
        .text-success { color: #10b981; }
        .text-danger { color: #ef4444; }
        .text-default { color: #f8fafc; }

        .trend-up { font-size: 0.75rem; color: #10b981; }

        .analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1.5rem;
        }

        .title-wrap { display: flex; align-items: center; gap: 15px; }

        .success-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #ef4444;
          padding: 0.85rem 1.25rem;
          border-radius: 10px;
          font-size: 0.85rem;
        }

        .analyzing-spinner {
          display: flex;
          justify-content: center;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .optimization-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .optimization-item {
          display: grid;
          grid-template-columns: 180px 1fr 100px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          align-items: center;
          gap: 2rem;
          transition: border-color 0.3s;
        }
        .optimization-item:hover { border-color: #a855f7; }

        .item-left { display: flex; flex-direction: column; gap: 10px; }
        .category-tag { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #a855f7; }
        .impact-badge { font-size: 0.65rem; padding: 4px 8px; border-radius: 4px; font-weight: 700; width: fit-content; }
        .impact-badge[data-impact="Crítico"] { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .impact-badge[data-impact="Alto"] { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .impact-badge[data-impact="Medio"] { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .impact-badge[data-impact="Bajo"] { background: rgba(16, 185, 129, 0.2); color: #10b981; }

        .obs-wrap, .suggest-wrap { display: flex; gap: 12px; font-size: 0.9rem; line-height: 1.5; }
        .obs-wrap { color: var(--text-secondary); margin-bottom: 1rem; }
        .suggest-wrap { color: var(--text-primary); }

        .circular-score {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: conic-gradient(#a855f7 calc(var(--percent) * 1%), #1e293b 0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          position: relative;
        }
        .circular-score::after {
          content: "";
          position: absolute;
          width: 48px;
          height: 48px;
          background: var(--bg-sidebar);
          border-radius: 50%;
        }
        .circular-score span { position: relative; z-index: 1; }

        .col-span-2 { grid-column: span 2; }
        .p-1-5 { padding: 1.5rem; }
        .br-lg { border-radius: var(--radius-lg); }
        .mb-4 { margin-bottom: 2rem; }
        .mb-2 { margin-bottom: 1.5rem; }
        .p-2 { padding: 2rem; }
      `}</style>
        </div>
    );
};

export default AIAnalyst;

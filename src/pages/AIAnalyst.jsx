import React, { useState } from 'react';
import { Brain, Save, Zap, MessageSquare, TrendingUp, Lightbulb, ShieldCheck, Target } from 'lucide-react';

const AIAnalyst = () => {
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState('gpt-4o');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const mockAnalyses = [
        {
            id: 1,
            category: 'Empatía y Tono',
            score: 85,
            observation: 'El agente mantiene un tono sumamente profesional, pero tiende a ser robótico durante el cierre.',
            improvement: 'Ajustar el prompt del sistema para incluir variaciones dinámicas en las despedidas según el sentimiento de la llamada.',
            impact: 'Alto'
        },
        {
            id: 2,
            category: 'Resolución al primer contacto',
            score: 72,
            observation: 'Se detectaron 3 llamadas donde el agente no pudo responder dudas sobre la garantía.',
            improvement: 'Aumentar la base de conocimientos con la sección de "Políticas de Reemplazo" del manual v2.',
            impact: 'Crítico'
        },
        {
            id: 3,
            category: 'Claridad en la Oferta',
            score: 94,
            observation: 'La estructura de beneficios se comunica de forma impecable.',
            improvement: 'Mantener la estructura actual, pero intentar reducir la duración de la explicación en un 10%.',
            impact: 'Bajo'
        }
    ];

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
                        <h3>Configuración de Seguridad y Modelo</h3>
                    </div>
                    <div className="config-form-horizontal">
                        <div className="input-group-flex">
                            <label>API Provider Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Introducir clave de OpenAI o Gemini..."
                                className="modern-input"
                            />
                        </div>
                        <div className="input-group-flex">
                            <label>Motor de Análisis</label>
                            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="modern-select">
                                <option value="gpt-4o">OpenAI GPT-4o (Recomendado)</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Velocidad)</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Precisión)</option>
                            </select>
                        </div>
                        <button className="btn-primary-glow">
                            <Save size={18} /> Guardar
                        </button>
                    </div>
                </div>

                <div className="glass p-1-5 br-lg">
                    <div className="section-title">
                        <Target size={20} className="text-warning" />
                        <h3>KPI de Mejora</h3>
                    </div>
                    <div className="kpi-score-display">
                        <span className="score">83.5</span>
                        <span className="label">Índice de Salud del Agente</span>
                        <div className="trend-up">+2.4% vs semana previa</div>
                    </div>
                </div>
            </div>

            <div className="analysis-section glass p-2 br-lg">
                <div className="analysis-header mb-2">
                    <div className="title-wrap">
                        <Zap size={24} className="text-warning-glow" />
                        <h2>Sugerencias de Optimización Automática</h2>
                    </div>
                    <button className={`btn-analyze ${isAnalyzing ? 'loading' : ''}`} onClick={() => setIsAnalyzing(true)}>
                        {isAnalyzing ? 'Procesando API...' : 'Ejecutar Análisis Completo'}
                    </button>
                </div>

                <div className="optimization-list">
                    {mockAnalyses.map(item => (
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
                            </div>
                            <div className="item-right">
                                <div className="circular-score" style={{ '--percent': item.score }}>
                                    {item.score}%
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
        }

        .input-group-flex {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .input-group-flex label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }

        .modern-input, .modern-select {
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
        }

        .kpi-score-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100px;
        }

        .kpi-score-display .score { font-size: 2.5rem; font-weight: 800; color: #10b981; }
        .kpi-score-display .label { font-size: 0.8rem; color: var(--text-muted); }
        .kpi-score-display .trend-up { font-size: 0.7rem; color: #10b981; margin-top: 4px; }

        .analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1.5rem;
        }

        .title-wrap { display: flex; align-items: center; gap: 15px; }

        .btn-analyze {
          background: linear-gradient(135deg, #a855f7, #6366f1);
          color: white;
          padding: 10px 24px;
          border-radius: 30px;
          font-weight: 700;
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
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
          font-size: 0.9rem;
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
      `}</style>
        </div>
    );
};

export default AIAnalyst;

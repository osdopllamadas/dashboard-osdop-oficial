import React, { useMemo } from 'react';
import { Activity, Phone, Clock, User, Mic, RefreshCcw } from 'lucide-react';
import { useCalls } from '../context/CallContext';

const LiveActivity = () => {
    const { allCalls, isFetchingGlobal, error } = useCalls();

    const liveCalls = useMemo(() => {
        if (!allCalls) return [];
        // Be broad: any call without endReason that isn't explicitly ended
        return allCalls.filter(c => !c.endReason && c.state !== 'ended' && c.state !== 'ended-no-recording');
    }, [allCalls]);

    return (
        <div className="page-container animate-fade-in">
            <header className="header-row">
                <div className="page-header">
                    <h1>Monitor <span className="text-primary-gradient">Tiempo Real</span></h1>
                    <p>Visualización de llamadas activas "In Vivo" — Modulo Técnico</p>
                </div>
                <div className="header-actions">
                    {isFetchingGlobal && (
                        <div className="loading-badge">
                            <RefreshCcw size={14} className="spin-icon" /> Sincronizando...
                        </div>
                    )}
                </div>
            </header>

            {error && (
                <div className="error-banner glass">
                    <Activity size={20} className="text-red" />
                    <p>Error de conexión: {error}</p>
                </div>
            )}

            <div className="live-grid">
                {liveCalls.length === 0 ? (
                    <div className="no-live-full glass">
                        <div className="pulse-container">
                            <div className="pulse-ring"></div>
                            <div className="pulse-dot"></div>
                        </div>
                        <h3>Sin llamadas activas</h3>
                        <p>No se han detectado sesiones en vivo en los últimos 5 segundos.</p>

                        <div className="skeleton-preview">
                            {[1, 2, 3].map(i => (
                                <div key={`skeleton-${i}`} className="live-card glass skeleton-card faded">
                                    <div className="live-card-header">
                                        <div className="live-badge waiting">
                                            <div className="wait-dot"></div> DISPONIBLE
                                        </div>
                                        <span className="call-id">ESPERANDO...</span>
                                    </div>
                                    <div className="live-card-body">
                                        <div className="skeleton-line"></div>
                                        <div className="skeleton-line short"></div>
                                    </div>
                                    <div className="live-card-footer">
                                        <div className="mic-status">Escuchando actividad...</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    liveCalls.map(call => (
                        <div key={call.callId} className="live-card glass border-blue active-live animate-fade-in">
                            <div className="live-card-header">
                                <div className="live-badge">
                                    <div className="pulse-dot"></div> EN VIVO
                                </div>
                                <span className="call-id">#{call.callId.slice(-8)}</span>
                            </div>

                            <div className="live-card-body">
                                <div className="live-info">
                                    <Phone size={18} className="text-blue" />
                                    <span className="phone-number">{call.customerPhoneNumber || 'Oculto'}</span>
                                </div>
                                <div className="live-info">
                                    <Clock size={16} />
                                    <span>Conectada: {new Date(call.created).toLocaleTimeString()}</span>
                                </div>
                                <div className="live-info">
                                    <User size={16} />
                                    <span>Agente ID: {call.agentId?.slice(0, 12) || 'Autónomo'}</span>
                                </div>
                            </div>

                            <div className="live-card-footer">
                                <div className="audio-visualizer">
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                </div>
                                <div className="mic-status active">
                                    <Mic size={14} /> Transmitiendo Audio
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx="true">{`
                .header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .text-primary-gradient {
                    background: linear-gradient(135deg, #3b82f6, #60a5fa);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .loading-badge {
                    background: rgba(59, 130, 246, 0.1);
                    color: #60a5fa;
                    padding: 6px 16px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .spin-icon { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(-360deg); } }

                .error-banner {
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 2rem;
                    color: #f87171;
                }

                .live-grid {
                    margin-top: 1rem;
                }

                .no-live-full {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 4rem 2rem;
                    border-radius: 20px;
                    background: rgba(255, 255, 255, 0.02);
                }

                .no-live-full h3 { font-size: 1.5rem; margin: 1rem 0 0.5rem; color: #f1f5f9; }
                .no-live-full p { color: #94a3b8; margin-bottom: 3rem; }

                .skeleton-preview {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                    width: 100%;
                }

                .active-live {
                    border-left: 4px solid #3b82f6;
                    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.15);
                }

                .live-card {
                    padding: 1.5rem;
                    border-radius: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                }

                .live-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .live-badge {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .call-id { font-size: 0.75rem; color: #64748b; font-family: monospace; }

                .live-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    margin-bottom: 1.5rem;
                }

                .live-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #94a3b8;
                    font-size: 0.95rem;
                }

                .phone-number { color: #f1f5f9; font-weight: 700; font-size: 1.1rem; }

                .live-card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1.25rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .audio-visualizer {
                    display: flex;
                    align-items: flex-end;
                    gap: 3px;
                    height: 18px;
                }

                .bar {
                    width: 3px;
                    background: #3b82f6;
                    border-radius: 10px;
                    animation: barGrow 1s ease-in-out infinite;
                }

                .bar:nth-child(1) { height: 40%; animation-delay: 0.1s; }
                .bar:nth-child(2) { height: 80%; animation-delay: 0.2s; }
                .bar:nth-child(3) { height: 100%; animation-delay: 0.3s; }
                .bar:nth-child(4) { height: 60%; animation-delay: 0.4s; }
                .bar:nth-child(5) { height: 40%; animation-delay: 0.5s; }

                @keyframes barGrow {
                    0%, 100% { transform: scaleY(0.4); }
                    50% { transform: scaleY(1); }
                }

                .mic-status {
                    font-size: 0.75rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .mic-status.active { color: #10b981; font-weight: 600; }

                .faded { opacity: 0.4; pointer-events: none; }
                
                .skeleton-line {
                    height: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    width: 80%;
                    margin-bottom: 8px;
                }
                .skeleton-line.short { width: 40%; }

                .live-badge.waiting { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
                .wait-dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; }

                .text-blue { color: #3b82f6; }
                .text-red { color: #ef4444; }

                .pulse-container { position: relative; width: 24px; height: 24px; }
                .pulse-ring {
                    position: absolute;
                    width: 100%; height: 100%;
                    border: 2px solid #3b82f6;
                    border-radius: 50%;
                    animation: circlePulse 2s infinite;
                }
                @keyframes circlePulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LiveActivity;

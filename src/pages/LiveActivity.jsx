import React, { useState, useEffect } from 'react';
import { ultravoxService } from '../services/ultravox';
import { Activity, Phone, Clock, User, Mic } from 'lucide-react';

const LiveActivity = () => {
    const [liveCalls, setLiveCalls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLive = async () => {
            try {
                const calls = await ultravoxService.getCalls();
                if (calls) {
                    // In Ultravox, active calls stay in 'joined' state
                    const active = calls.filter(c => c.state === 'joined' && !c.endReason);
                    setLiveCalls(active);
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchLive();
        const interval = setInterval(fetchLive, 10000); // Fast polling for Live
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Monitor <span className="text-primary-gradient">Tiempo Real</span></h1>
                <p>Visualización de llamadas activistas "In Vivo"</p>
            </header>

            <div className="live-grid">
                {liveCalls.length === 0 ? (
                    <>
                        {[1, 2, 3].map(i => (
                            <div key={`skeleton-${i}`} className="live-card glass skeleton-card">
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
                    </>
                ) : (
                    liveCalls.map(call => (
                        <div key={call.callId} className="live-card glass border-blue">
                            <div className="live-card-header">
                                <div className="live-badge">
                                    <div className="pulse-dot"></div> EN VIVO
                                </div>
                                <span className="call-id">#{call.callId.slice(-6)}</span>
                            </div>

                            <div className="live-card-body">
                                <div className="live-info">
                                    <Phone size={16} />
                                    <span>{call.customerPhoneNumber || 'Oculto'}</span>
                                </div>
                                <div className="live-info">
                                    <Clock size={16} />
                                    <span>Conectada: {new Date(call.created).toLocaleTimeString()}</span>
                                </div>
                                <div className="live-info">
                                    <User size={16} />
                                    <span>Agente: {call.agentId?.slice(0, 8) || 'Ultravox Agent'}</span>
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
                                    <Mic size={14} /> Transmitiendo
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx="true">{`
                .text-primary-gradient {
                    background: linear-gradient(135deg, #3b82f6, #60a5fa);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .live-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-top: 2rem;
                }

                .no-live {
                    grid-column: 1 / -1;
                    padding: 4rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .pulse-icon {
                    color: var(--primary);
                    animation: pulse 2s infinite;
                }

                .live-card {
                    padding: 1.5rem;
                    border-left: 4px solid var(--primary);
                    position: relative;
                    overflow: hidden;
                }

                .border-blue { border-color: #3b82f6; }

                .live-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .live-badge {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .call-id { font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }

                .live-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 1.5rem;
                }

                .live-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .live-card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                }

                .audio-visualizer {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    height: 15px;
                }

                .bar {
                    width: 3px;
                    background: var(--primary);
                    border-radius: 10px;
                    animation: barGrow 1s ease-in-out infinite;
                }

                .bar:nth-child(2) { height: 100%; animation-delay: 0.1s; }
                .bar:nth-child(3) { height: 100%; animation-delay: 0.2s; }
                .bar:nth-child(4) { height: 100%; animation-delay: 0.3s; }
                .bar:nth-child(5) { height: 100%; animation-delay: 0.4s; }

                @keyframes barGrow {
                    0%, 100% { height: 5px; }
                    50% { height: 15px; }
                }

                .mic-status {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .mic-status.active { color: #10b981; }

                .skeleton-card {
                    opacity: 0.5;
                    border-left: 4px solid #1e293b;
                    filter: grayscale(1);
                }

                .skeleton-line {
                    height: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    width: 80%;
                    position: relative;
                    overflow: hidden;
                }

                .skeleton-line::after {
                    content: "";
                    position: absolute;
                    top: 0; right: 0; bottom: 0; left: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    animation: skeleton-sweep 2s infinite;
                }

                @keyframes skeleton-sweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .skeleton-line.short { width: 50%; }

                .live-badge.waiting {
                    background: rgba(148, 163, 184, 0.1);
                    color: #94a3b8;
                }

                .wait-dot {
                    width: 6px;
                    height: 6px;
                    background: #94a3b8;
                    border-radius: 50%;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
};

export default LiveActivity;

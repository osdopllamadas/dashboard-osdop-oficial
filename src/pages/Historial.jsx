import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ultravoxService } from '../services/ultravox';
import { Phone, Download, X, Play, Music, MessageSquare, Info, RefreshCcw, Pause, SkipBack, SkipForward } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import { useCalls } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';

const CustomAudioPlayer = ({ src, fileName = 'grabacion', onError }) => {
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const [hasError, setHasError] = React.useState(false);

  // Reset player when src changes
  React.useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [src]);

  const onAudioError = () => {
    // If it's our own proxy failing, it probably means it's not ready yet
    console.warn('[AudioPlayer] Audio load error', src);
    setHasError(true);
    if (onError) onError();
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
    setIsLoading(false);
  };

  const onSeek = (e) => {
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (amount) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${fileName}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(src);
    alert('Enlace de la API copiado al portapapeles');
  };

  return (
    <div className="premium-audio-player">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={onAudioError}
      />

      <div className="player-main-controls">
        <button className="play-pause-btn-large" onClick={togglePlay} disabled={isLoading || hasError}>
          {hasError ? (
            <X size={24} />
          ) : isLoading ? (
            <RefreshCcw size={24} className="spin-icon" />
          ) : isPlaying ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />
          )}
        </button>

        <div className="player-track-info">
          {hasError ? (
            <div className="time-display-row" style={{ color: '#ef4444' }}>
              Error al cargar archivo. Reintentando...
            </div>
          ) : (
            <div className="time-display-row">
              <span className="current-time">{formatTime(currentTime)}</span>
              <div className="track-slider-container">
                <input
                  type="range"
                  className="premium-slider"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={onSeek}
                />
                <div
                  className="slider-progress"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>
              </div>
              <span className="total-time">{formatTime(duration)}</span>
            </div>
          )}

          <div className="player-actions-row">
            <div className="skip-controls">
              <button className="icon-btn-text" onClick={() => skip(-10)} disabled={hasError}>
                <SkipBack size={14} /> -10s
              </button>
              <button className="icon-btn-text" onClick={() => skip(10)} disabled={hasError}>
                +10s <SkipForward size={14} />
              </button>
            </div>

            <div className="utility-controls">
              <button className="utility-btn" onClick={copyLink} title="Copiar Link API" disabled={hasError}>
                <RefreshCcw size={14} /> Link API
              </button>
              <button className="utility-btn primary" onClick={downloadAudio} title="Descargar Grabación" disabled={hasError}>
                <Download size={14} /> Descargar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Historial = () => {
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [localDetail, setLocalDetail] = useState(null);
  const [hasError, setHasError] = useState(false);
  const { allCalls, isFetchingGlobal, filters, setFilters } = useCalls();
  const { token } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const selectedCall = useMemo(() => {
    if (localDetail && localDetail.callId === selectedCallId) return localDetail;
    return allCalls?.find(c => c.callId === selectedCallId);
  }, [allCalls, selectedCallId, localDetail]);

  // Reset local detail, pagination page, and error state when closing or changing call/filters
  useEffect(() => {
    setLocalDetail(null);
    setHasError(false);
  }, [selectedCallId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // OPTIMIZATION: High-frequency polling when audio is missing or has error
  useEffect(() => {
    if (!selectedCallId || (selectedCall && selectedCall.recordingUrl && !hasError)) return;

    const interval = setInterval(async () => {
      try {
        const detail = await ultravoxService.getCallDetail(selectedCallId, token);
        if (detail && detail.recordingUrl) {
          setLocalDetail(detail);
          setHasError(false);
        }
      } catch (e) { }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedCallId, selectedCall?.recordingUrl, hasError]);

  const filteredCalls = useMemo(() => {
    if (!allCalls) return [];
    return allCalls.filter(call => {
      if (filters.from && call.created < filters.from) return false;
      if (filters.to) {
        const toLimit = new Date(filters.to);
        toLimit.setDate(toLimit.getDate() + 1);
        const toLimitStr = toLimit.toISOString().split('T')[0];
        if (call.created >= toLimitStr) return false;
      }
      if (filters.phone && !call.customerPhoneNumber?.includes(filters.phone)) return false;

      const durationVal = call.billedDuration || 0;
      if (filters.minSec && durationVal < filters.minSec) return false;

      if (filters.status && filters.status !== 'Todos') {
        const isSuccess = ['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason);
        if (filters.status === 'Completada' && !isSuccess) return false;
        if (filters.status === 'Fallida' && isSuccess) return false;
      }
      return true;
    });
  }, [allCalls, filters]);

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCalls.slice(start, start + itemsPerPage);
  }, [filteredCalls, currentPage]);

  const isLoadingInitial = isFetchingGlobal && (!allCalls || allCalls.length === 0);

  const handleDownload = () => {
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
      escapeCsv(`${Math.round(c.billedDuration || 0)}s`),
      escapeCsv(c.endReason),
      escapeCsv(c.summary || 'Sin detalle')
    ].join(",")).join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `historial_filtrado_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="header-row">
        <header className="page-header">
          <h1>Historial de <span className="text-secondary-gradient">Llamadas en vivo</span></h1>
          <p>Registro completo de interacciones en vivo de cada llamada — {filteredCalls.length} resultados</p>
        </header>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isFetchingGlobal && (
            <div className="loading-badge">
              <RefreshCcw size={14} className="spin-icon" /> Sincronizando...
            </div>
          )}
          <button className="download-btn" onClick={handleDownload} disabled={isLoadingInitial}>
            <Download size={16} /> Descargar CSV
          </button>
        </div>
      </div>

      <FilterBar onFilterChange={setFilters} resultsCount={filteredCalls.length} filters={filters} />

      {isLoadingInitial ? (
        <div className="initial-loading-container">
          <div className="spinner-large"></div>
          <p>Cargando historial de registros...</p>
        </div>
      ) : (
        <div className="content-fade-up">
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
                {paginatedCalls.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <p>No se encontraron llamadas que coincidan con los filtros.</p>
                    </td>
                  </tr>
                )}
                {paginatedCalls.map(call => (
                  <tr key={call.callId}>
                    <td className="tel-cell clickable" onClick={() => setSelectedCallId(call.callId)}>
                      <div className="icon-circle"><Phone size={14} /></div>
                      {call.customerPhoneNumber || 'Oculto'}
                    </td>
                    <td>
                      <div className="dateTime">
                        <span className="date">{new Date(call.created).toLocaleDateString()}</span>
                        <span className="time">{new Date(call.created).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td>{Math.round(call.billedDuration || 0)}s</td>
                    <td>
                      <span className={`badge ${['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason) ? 'success' : 'error'}`}>
                        {['normal', 'agent_ended', 'hangup', 'completed'].includes(call.endReason) ? 'Completada' : 'Fallida'}
                      </span>
                    </td>
                    <td>
                      <button className="view-btn" onClick={() => setSelectedCallId(call.callId)}>Ver Detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Mostrando del {((currentPage - 1) * itemsPerPage) + 1} al {Math.min(currentPage * itemsPerPage, filteredCalls.length)} de {filteredCalls.length} llamadas
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{ padding: '0.5rem 1rem', background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'white', padding: '0 0.5rem' }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: '0.5rem 1rem', background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCall && (
        <div className="modal-overlay" onClick={() => setSelectedCallId(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-info">
                <div className="modal-title-row">
                  <div className="icon-circle-large"><Phone size={20} /></div>
                  <div>
                    <h2>Detalle de Llamada</h2>
                    <p className="modal-subtitle">{selectedCall.customerPhoneNumber || 'Oculto'}</p>
                  </div>
                </div>
              </div>
              <button className="close-btn-circle" onClick={() => setSelectedCallId(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body custom-scrollbar">
              <div className="info-grid-mini">
                <div className="info-item-mini">
                  <span className="info-label">ID de Llamada</span>
                  <span className="info-value">{selectedCall.callId}</span>
                </div>
                <div className="info-item-mini">
                  <span className="info-label">Fecha y Hora</span>
                  <span className="info-value">
                    {new Date(selectedCall.created).toLocaleDateString()} {new Date(selectedCall.created).toLocaleTimeString()}
                  </span>
                </div>
                <div className="info-item-mini">
                  <span className="info-label">Duración</span>
                  <span className="info-value">{Math.round(selectedCall.billedDuration || 0)}s</span>
                </div>
                <div className="info-item-mini">
                  <span className="info-label">Estado</span>
                  <span className={`badge-mini ${['normal', 'agent_ended', 'hangup', 'completed'].includes(selectedCall.endReason) ? 'success' : 'error'}`}>
                    {['normal', 'agent_ended', 'hangup', 'completed'].includes(selectedCall.endReason) ? 'Completada' : 'Fallida'}
                  </span>
                </div>
              </div>

              <div className="detail-section audio-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="detail-title">
                  <Music size={16} /> Grabación de Audio
                </div>
                {selectedCall.recordingUrl && !hasError ? (
                  <div className="audio-player-modal-wrapper shadow-premium">
                    <CustomAudioPlayer
                      src={selectedCall.recordingUrl}
                      fileName={`llamada_${selectedCall.customerPhoneNumber || selectedCall.callId}`}
                      onError={() => setHasError(true)}
                    />
                  </div>
                ) : (
                  <div className="no-recording-box-premium">
                    <RefreshCcw size={20} className="spin-icon text-primary" />
                    <div>
                      <p className="no-recording-main">Sincronizando grabación...</p>
                      <p className="no-recording-sub">
                        {hasError ? 'El audio se está terminando de procesar. Reintentando...' : 'La API de Ultravox está preparando el archivo de audio.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="detail-section animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="detail-title">
                  <Info size={16} /> Razon de la llamada
                </div>
                <div className="detail-card-glass">
                  <p className="detail-text">
                    {selectedCall.endReason === 'normal' || selectedCall.endReason === 'completed' ? 'Llamada finalizada correctamente.' :
                      selectedCall.endReason === 'agent_ended' ? 'Llamada finalizada por el agente.' :
                        `Llamada interrumpida: ${selectedCall.endReason}`}
                  </p>
                </div>
              </div>

              <div className="detail-section animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="detail-title">
                  <MessageSquare size={16} /> Resumen IA
                </div>
                <div className="detail-text-summary-box shadow-premium">
                  {selectedCall.summary || 'No hay un resumen generado.'}
                </div>
              </div>

              {selectedCall.transcript && (
                <div className="detail-section animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <div className="detail-title">
                    <MessageSquare size={16} /> Transcripción
                  </div>
                  <div className="transcript-box custom-scrollbar">
                    {selectedCall.transcript}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="footer-close-btn" onClick={() => setSelectedCallId(null)}>Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .text-secondary-gradient { background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .download-btn { background: var(--bg-accent); color: white; padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
        .table-container-modern { padding: 1rem; border-radius: var(--radius-lg); overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; padding: 1rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        .modern-table td { padding: 1.25rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        .tel-cell { display: flex; align-items: center; gap: 12px; font-weight: 600; cursor: pointer; color: var(--primary); }
        
        .premium-audio-player { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
        .player-main-controls { display: flex; align-items: center; gap: 1.5rem; }
        .play-pause-btn-large { width: 60px; height: 60px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); }
        .player-track-info { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
        .time-display-row { display: flex; align-items: center; gap: 12px; font-family: monospace; font-size: 0.85rem; }
        .track-slider-container { flex: 1; position: relative; height: 6px; display: flex; align-items: center; }
        .premium-slider { -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none; }
        .slider-progress { position: absolute; left: 0; top: 0; height: 6px; background: #3b82f6; border-radius: 3px; pointer-events: none; }
        .player-actions-row { display: flex; justify-content: space-between; align-items: center; }
        .skip-controls, .utility-controls { display: flex; gap: 10px; }
        .icon-btn-text, .utility-btn { background: none; border: none; color: var(--text-muted); font-size: 0.75rem; display: flex; align-items: center; gap: 4px; cursor: pointer; }
        .utility-btn.primary { color: #3b82f6; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px; }
        .view-btn { color: #60a5fa; font-size: 0.85rem; font-weight: 700; padding: 8px 16px; border-radius: 8px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.2); cursor: pointer; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(2, 5, 18, 0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-content-card { width: 100%; max-width: 700px; max-height: 90vh; background: #0a0d21; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
        .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 2rem; overflow-y: auto; flex: 1; }
        .info-grid-mini { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: 16px; }
        .info-item-mini { display: flex; flex-direction: column; }
        .info-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
        .info-value { font-size: 0.85rem; font-weight: 600; color: white; }
        .badge, .badge-mini { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
        .success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .detail-title { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #60a5fa; margin-bottom: 12px; }
        .detail-text-summary-box { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 20, 45, 0.4)); padding: 1.5rem; border-radius: 16px; border-left: 4px solid #3b82f6; color: white; }
        .audio-player-modal-wrapper { background: rgba(0, 0, 0, 0.4); padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); }
        .transcript-box { background: rgba(0, 0, 0, 0.2); padding: 1rem; border-radius: 12px; max-height: 200px; overflow-y: auto; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.05); }
        .footer-close-btn { background: #3b82f6; color: white; padding: 10px 24px; border-radius: 10px; font-weight: 600; border: none; cursor: pointer; }
        .spin-icon { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Historial;

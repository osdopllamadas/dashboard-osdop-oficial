import React, { useState } from 'react';
import { Search, RotateCcw, Calendar, Phone, Clock, ChevronDown } from 'lucide-react';

const FilterBar = ({ onFilterChange, resultsCount = 0, filters }) => {
  const [localFilters, setLocalFilters] = useState({
    preset: filters?.preset || 'Todos',
    from: filters?.from || '',
    to: filters?.to || '',
    phone: filters?.phone || '',
    minSec: filters?.minSec || 0,
    status: filters?.status || 'Todos'
  });

  const presets = ['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días', 'Este mes', 'Este año', 'Todos'];

  const handlePresetClick = (p) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let newDateRange = { from: '', to: '' };

    if (p === 'Hoy') {
      newDateRange = { from: todayStr, to: todayStr };
    } else if (p === 'Ayer') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      newDateRange = { from: yesterday.toISOString().split('T')[0], to: yesterday.toISOString().split('T')[0] };
    } else if (p === 'Últimos 7 días') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      newDateRange = { from: d.toISOString().split('T')[0], to: todayStr };
    } else if (p === 'Últimos 30 días') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      newDateRange = { from: d.toISOString().split('T')[0], to: todayStr };
    } else if (p === 'Este mes') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      newDateRange = { from: firstDay, to: todayStr };
    } else if (p === 'Este año') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      newDateRange = { from: firstDayOfYear, to: todayStr };
    }

    const updated = {
      ...localFilters,
      preset: p,
      ...newDateRange
    };
    setLocalFilters(updated);
    // Presets apply immediately for better UX
    onFilterChange(updated);
  };

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    const cleared = {
      preset: 'Todos',
      from: '',
      to: '',
      phone: '',
      minSec: 0,
      status: 'Todos'
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const updateLocal = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
      preset: (key === 'from' || key === 'to') ? 'Personalizado' : prev.preset
    }));
  };

  return (
    <div className="filter-bar-container glass">
      <div className="preset-row">
        <div className="filter-icon">
          <Search size={16} />
        </div>
        <div className="presets-group">
          {presets.map(p => (
            <button
              key={p}
              className={`preset-btn ${localFilters.preset === p ? 'active' : ''}`}
              onClick={() => handlePresetClick(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="date-inputs">
          <div className="date-wrapper" onClick={(e) => e.currentTarget.querySelector('input').showPicker?.()}>
            <Calendar size={14} className="calendar-icon" />
            <input
              type="date"
              value={localFilters.from}
              onChange={(e) => updateLocal('from', e.target.value)}
            />
          </div>
          <span className="date-sep">a</span>
          <div className="date-wrapper" onClick={(e) => e.currentTarget.querySelector('input').showPicker?.()}>
            <Calendar size={14} className="calendar-icon" />
            <input
              type="date"
              value={localFilters.to}
              onChange={(e) => updateLocal('to', e.target.value)}
            />
          </div>
        </div>

        <div className="input-field phone-field">
          <Phone size={14} />
          <input
            type="text"
            placeholder="Teléfono..."
            value={localFilters.phone}
            onChange={(e) => updateLocal('phone', e.target.value)}
          />
        </div>

        <button className="apply-btn" onClick={handleApply}>
          Aplicar Filtros
        </button>
      </div>

      <div className="bottom-row">
        <div className="input-field min-sec">
          <span>Min seg:</span>
          <input
            type="number"
            value={localFilters.minSec}
            onChange={(e) => updateLocal('minSec', e.target.value)}
          />
        </div>

        <div className="input-field status-select">
          <select
            value={localFilters.status}
            onChange={(e) => updateLocal('status', e.target.value)}
          >
            <option value="Todos">Estado</option>
            <option value="Completada">Completada</option>
            <option value="Fallida">Fallida</option>
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </div>

        <div className="results-info">
          <span className="results-label">{resultsCount} resultados</span>
        </div>

        <button className="clear-btn" onClick={handleClear}>
          <RotateCcw size={14} />
          Limpiar
        </button>
      </div>



      <style jsx="true">{`
        .filter-bar-container {
          padding: 1rem 1.5rem;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .preset-row, .bottom-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-icon {
          color: var(--text-muted);
          margin-right: 0.5rem;
        }

        .presets-group {
          display: flex;
          background: var(--bg-primary);
          padding: 4px;
          border-radius: 8px;
          gap: 4px;
        }

        .preset-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .preset-btn.active {
          background: var(--primary);
          color: white;
        }

        .date-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .date-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-input);
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .date-wrapper:hover {
          border-color: var(--primary);
          background: rgba(139, 92, 246, 0.05);
        }
        
        .calendar-icon {
          color: var(--primary);
          opacity: 0.7;
        }

        .date-wrapper input {
          background: none;
          border: none;
          color: white;
          font-size: 0.8rem;
          font-family: inherit;
          cursor: pointer;
          width: 110px;
        }
        
        .date-sep {
          color: var(--text-muted);
          font-weight: 500;
        }

        .input-field {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-input);
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          position: relative;
        }

        .input-field input, .input-field select {
          background: none;
          border: none;
          color: white;
          font-size: 0.8rem;
          outline: none;
          cursor: pointer;
        }

        .input-field select option {
          background: #0f172a;
          color: white;
          padding: 8px;
        }

        .phone-field { flex: 1; max-width: 250px; }
        .min-sec input { width: 50px; }
        
        .status-select { min-width: 120px; position: relative; }
        .status-select select { 
          width: 100%; 
          appearance: none;
          -webkit-appearance: none;
          padding-right: 20px;
        }
        .select-arrow { 
          position: absolute;
          right: 10px;
          pointer-events: none; 
          color: #64748b;
        }

        .apply-btn {
          background: linear-gradient(135deg, var(--primary), #7c3aed);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
          border: none;
          cursor: pointer;
        }

        .apply-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(139, 92, 246, 0.4);
          filter: brightness(1.1);
        }

        .apply-btn:active {
          transform: translateY(0);
        }

        .results-info {
          margin-left: auto;
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(255,255,255,0.03);
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .results-label { font-weight: 500; color: var(--primary); margin-right: 4px; }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 0.8rem;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .clear-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 0;
        }

        @media (max-width: 768px) {
          .preset-row, .bottom-row {
            flex-direction: column;
            align-items: stretch;
          }
          .phone-field { max-width: none; }
          .apply-btn { width: 100%; }
        }

      `}</style>
    </div>
  );
};

export default FilterBar;

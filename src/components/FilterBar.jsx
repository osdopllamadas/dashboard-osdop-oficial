import React, { useState } from 'react';
import { Search, RotateCcw, Calendar, Phone, Clock, ChevronDown } from 'lucide-react';

const FilterBar = ({ onFilterChange, resultsCount = 0 }) => {
  const [activePreset, setActivePreset] = useState('Todos');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [phone, setPhone] = useState('');
  const [minSec, setMinSec] = useState(0);
  const [status, setStatus] = useState('Todos');

  const presets = ['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días', 'Este mes', 'Este año', 'Todos'];

  const handleClear = () => {
    setActivePreset('Todos');
    setDateRange({ from: '', to: '' });
    setPhone('');
    setMinSec(0);
    setStatus('Todos');
    onFilterChange({ preset: 'Todos', phone: '', minSec: 0, status: 'Todos', from: '', to: '' });
  };


  const updateFilter = (updates) => {
    let newDateRange = { ...dateRange };
    let newActivePreset = updates.activePreset || activePreset;

    if (updates.activePreset) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (updates.activePreset === 'Hoy') {
        newDateRange = { from: todayStr, to: todayStr };
      } else if (updates.activePreset === 'Ayer') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        newDateRange = { from: yStr, to: yStr };
      } else if (updates.activePreset === 'Últimos 7 días') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        newDateRange = { from: d.toISOString().split('T')[0], to: todayStr };
      } else if (updates.activePreset === 'Últimos 30 días') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        newDateRange = { from: d.toISOString().split('T')[0], to: todayStr };
      } else if (updates.activePreset === 'Este mes') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        newDateRange = { from: firstDay, to: todayStr };
      } else if (updates.activePreset === 'Este año') {
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        newDateRange = { from: firstDayOfYear, to: todayStr };
      } else if (updates.activePreset === 'Todos') {
        newDateRange = { from: '', to: '' };
      }

      setActivePreset(newActivePreset);
      setDateRange(newDateRange);
    }

    const newFilters = {
      preset: newActivePreset,
      phone: updates.phone !== undefined ? updates.phone : phone,
      minSec: updates.minSec !== undefined ? updates.minSec : minSec,
      status: updates.status !== undefined ? updates.status : status,
      from: newDateRange.from,
      to: newDateRange.to
    };

    if (updates.phone !== undefined) setPhone(updates.phone);
    if (updates.minSec !== undefined) setMinSec(updates.minSec);
    if (updates.status !== undefined) setStatus(updates.status);

    onFilterChange(newFilters);
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
              className={`preset-btn ${activePreset === p ? 'active' : ''}`}
              onClick={() => updateFilter({ activePreset: p })}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="date-inputs">
          <div className="date-wrapper">
            <Calendar size={14} />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange({ ...dateRange, from: e.target.value });
                updateFilter({ activePreset: 'Personalizado' });
              }}
            />
          </div>
          <span>a</span>
          <div className="date-wrapper">
            <Calendar size={14} />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                updateFilter({ activePreset: 'Personalizado' });
              }}
            />
          </div>
        </div>

        <div className="input-field phone-field">
          <Phone size={14} />
          <input
            type="text"
            placeholder="Teléfono..."
            value={phone}
            onChange={(e) => updateFilter({ phone: e.target.value })}
          />
        </div>
      </div>

      <div className="bottom-row">
        <div className="input-field min-sec">
          <span>Min seg:</span>
          <input
            type="number"
            value={minSec}
            onChange={(e) => updateFilter({ minSec: e.target.value })}
          />
        </div>

        <div className="input-field status-select">
          <select value={status} onChange={(e) => updateFilter({ status: e.target.value })}>
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
          Limpiar filtros
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
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .date-wrapper input {
          background: none;
          border: none;
          color: white;
          font-size: 0.75rem;
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

        .results-info {
          margin-left: auto;
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(255,255,255,0.03);
          padding: 4px 10px;
          border-radius: 4px;
        }
        
        .results-label { font-weight: 500; }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .clear-btn:hover { background: rgba(255,0,0,0.1); color: #ef4444; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        .results-count {
          color: var(--text-muted);
          margin-left: 4px;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default FilterBar;

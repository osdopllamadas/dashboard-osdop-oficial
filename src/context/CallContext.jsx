import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ultravoxService } from '../services/ultravox';

const CallContext = createContext({});

export const useCalls = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const [allCalls, setAllCalls] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        preset: 'Todos',
        from: '',
        to: '',
        phone: '',
        minSec: 0,
        status: 'Todos'
    });

    const isFetchingRef = useRef(false);

    const refreshData = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const data = await ultravoxService.getDashboardSummary();
            setAllCalls(data.calls);
            setStats(data);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error('[CallContext] Polling Error:', err);
            setError(err.message);
        } finally {
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000);
        // 10s is enough for background sync
        return () => clearInterval(interval);
    }, []);

    return (
        <CallContext.Provider value={{
            allCalls,
            stats,
            loading,
            error,
            filters,
            setFilters,
            refreshData,
            isFetchingGlobal: loading
        }}>
            {children}
        </CallContext.Provider>
    );
};

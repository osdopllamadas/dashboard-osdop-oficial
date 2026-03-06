import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ultravoxService } from '../services/ultravox';

const CallContext = createContext({});

export const useCalls = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const [allCalls, setAllCalls] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true); // Step 7: loading state
    const [error, setError] = useState(null);      // Step 7: error state

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
            // Don't set loading to false if it's the first time and it failed
        } finally {
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        // Initial load
        refreshData();

        // Step 8: Controlled 5s Polling
        const interval = setInterval(refreshData, 5000);

        return () => clearInterval(interval);
    }, []);

    // Helper to filter calls based on dashboard typical filters
    const getFilteredCalls = (filters = {}) => {
        return allCalls; // Sorting/filtering handled by components or here
    };

    return (
        <CallContext.Provider value={{
            allCalls,
            stats,
            loading,
            error,
            refreshData,
            isFetchingGlobal: loading // Compatibility with existing components
        }}>
            {children}
        </CallContext.Provider>
    );
};

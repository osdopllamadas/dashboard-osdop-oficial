/**
 * Step 2 & 3: Frontend Layer
 * This service now points to the internal Aggregator Layer
 */
export const ultravoxService = {
    // Fetches the normalized dashboard summary from our internal aggregator
    getDashboardSummary: async () => {
        try {
            console.log('[UltravoxService] Fetching /api/dashboard-summary');
            const response = await fetch('/api/dashboard-summary');
            if (!response.ok) throw new Error(`Aggregator error: ${response.status}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[UltravoxService] Dashboard Summary Error:', error);
            throw error;
        }
    },

    // Kept for backward compatibility in parts of the app that haven't migrated
    getCalls: async (params = {}, onProgress = null) => {
        try {
            // Indirectly use the aggregator or just fetch the summary
            const data = await ultravoxService.getDashboardSummary();
            if (onProgress) onProgress(data.calls, true);
            return data.calls;
        } catch (error) {
            return null;
        }
    },

    getUsage: async () => {
        try {
            const data = await ultravoxService.getDashboardSummary();
            return {
                totals: {
                    totalCount: data.totalCalls,
                    billedMinutes: data.totalMinutes,
                    errorCount: data.failedCalls
                },
                daily: data.dailyUsage
            };
        } catch (error) {
            return null;
        }
    },

    getStats: (calls) => {
        const COST_PER_MINUTE = 0.065;
        const totalCalls = calls.length;
        const totalMinutes = calls.reduce((acc, call) => acc + (parseFloat(call.billedDuration || 0) / 60), 0);
        const totalCost = totalMinutes * COST_PER_MINUTE;

        return {
            totalCalls,
            totalMinutes: totalMinutes.toFixed(2),
            totalCost: totalCost.toFixed(2),
            successRate: totalCalls > 0 ? Math.round((calls.filter(c => ['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason)).length / totalCalls) * 100) + '%' : '0%',
            failedCalls: calls.filter(c => !['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason)).length,
            avgDuration: totalCalls > 0 ? Math.round((totalMinutes * 60) / totalCalls) + 's' : '0s'
        };
    }
};

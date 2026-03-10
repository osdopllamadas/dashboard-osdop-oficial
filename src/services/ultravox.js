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

        const transferCalls = calls.filter(call => {
            const hasTool = (call.transcript || '').toLowerCase().includes('transferirllamada');
            const hasKeyword = ((call.summary || '') + (call.endReason || '')).toLowerCase().includes('transfer');
            return hasTool || hasKeyword;
        });

        const effectiveTransfers = transferCalls.filter(c => {
            const transcript = (c.transcript || '');
            const summary = (c.summary || '').toLowerCase();

            // Éxito explícito por el JSON de la herramienta
            const hasSuccessInTranscript = transcript.includes('{"status":"success","message":"Transfer initiated successfully."}');

            // Fallo explícito por palabra "error" en el contexto de transferencia (sumario o transcript)
            const hasErrorInSummary = summary.includes('error') && (summary.includes('transfer') || summary.includes('herramienta'));
            const hasErrorInTranscript = transcript.toLowerCase().includes('error') && transcript.toLowerCase().includes('transferirllamada');

            // Si hay un éxito explícito, es efectiva. 
            // Si no, verificamos estados de fallo.
            if (hasSuccessInTranscript) return true;
            if (hasErrorInSummary || hasErrorInTranscript) return false;

            // Fallback: si no hay transcript detallado, usamos el estado técnico
            return ['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason);
        }).length;

        const failedTransfers = transferCalls.length - effectiveTransfers;

        // Daily transfers for chart
        const dailyTransfers = {};
        transferCalls.forEach(call => {
            const date = call.created.split('T')[0];
            if (!dailyTransfers[date]) dailyTransfers[date] = { date, count: 0 };
            dailyTransfers[date].count += 1;
        });

        return {
            totalCalls,
            totalMinutes: totalMinutes.toFixed(2),
            totalCost: totalCost.toFixed(2),
            successRate: totalCalls > 0 ? Math.round((calls.filter(c => ['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason)).length / totalCalls) * 100) + '%' : '0%',
            failedCalls: calls.filter(c => !['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason)).length,
            avgDuration: totalCalls > 0 ? Math.round((totalMinutes * 60) / totalCalls) + 's' : '0s',
            totalTransfers: transferCalls.length,
            effectiveTransfers,
            failedTransfers,
            dailyTransfers: Object.values(dailyTransfers).sort((a, b) => a.date.localeCompare(b.date))
        };
    }
};

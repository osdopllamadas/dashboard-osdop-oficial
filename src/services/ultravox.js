/**
 * Ultravox Service — Frontend API Layer
 * All requests now pass the Authorization token to protected backend endpoints.
 * Usage: import the service and pass the token from useAuth().
 */

const apiFetch = async (url, token, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
};

export const ultravoxService = {
    // Fetches the normalized dashboard summary from our internal aggregator
    getDashboardSummary: async (token) => {
        try {
            return await apiFetch('/api/dashboard-summary', token);
        } catch (error) {
            console.error('[UltravoxService] Dashboard Summary Error:', error);
            throw error;
        }
    },

    // Fetches the latest state of a single call
    getCallDetail: async (callId, token) => {
        try {
            return await apiFetch(`/api/call-detail?id=${callId}`, token);
        } catch (error) {
            console.error('[UltravoxService] Call Detail Error:', error);
            return null;
        }
    },

    // Kept for backward compatibility — uses getDashboardSummary under the hood
    getCalls: async (params = {}, onProgress = null, token = null) => {
        try {
            const data = await ultravoxService.getDashboardSummary(token);
            if (onProgress) onProgress(data.calls, true);
            return data.calls;
        } catch (error) {
            return null;
        }
    },

    getUsage: async (token) => {
        try {
            const data = await ultravoxService.getDashboardSummary(token);
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

            const hasSuccessInTranscript = transcript.includes('{"status":"success","message":"Transfer initiated successfully."}');
            const hasErrorInSummary = summary.includes('error') && (summary.includes('transfer') || summary.includes('herramienta'));
            const hasErrorInTranscript = transcript.toLowerCase().includes('error') && transcript.toLowerCase().includes('transferirllamada');
            const hasSpecificError = transcript.includes('ultravox_call_id is invalid') || transcript.includes('"status":"error"');

            if (hasSuccessInTranscript) return true;
            if (hasErrorInSummary || hasErrorInTranscript || hasSpecificError) return false;

            return ['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason);
        }).length;

        const failedTransfers = transferCalls.length - effectiveTransfers;

        const dailyTransfers = {};
        transferCalls.forEach(call => {
            const date = (call.created || '').split('T')[0];
            if (!date) return;
            if (!dailyTransfers[date]) dailyTransfers[date] = { date, count: 0 };
            dailyTransfers[date].count += 1;
        });

        return {
            totalCalls,
            totalMinutes: totalMinutes.toFixed(2),
            totalCost: totalCost.toFixed(2),
            successRate: totalCalls > 0
                ? Math.round((calls.filter(c => ['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason)).length / totalCalls) * 100) + '%'
                : '0%',
            failedCalls: calls.filter(c => !['normal', 'agent_ended', 'completed', 'hangup'].includes(c.endReason)).length,
            avgDuration: totalCalls > 0 ? Math.round((totalMinutes * 60) / totalCalls) + 's' : '0s',
            totalTransfers: transferCalls.length,
            effectiveTransfers,
            failedTransfers,
            dailyTransfers: Object.values(dailyTransfers).sort((a, b) => a.date.localeCompare(b.date))
        };
    }
};

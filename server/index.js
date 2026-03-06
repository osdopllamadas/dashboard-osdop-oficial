import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ULTRAVOX_API_KEY;
const BASE_URL = 'https://api.ultravox.ai/api';

app.use(cors());
app.use(express.json());

// In-memory cache
let cache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 10000; // 10 seconds

const fetchUltravox = async (endpoint) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`[Backend] Fetching Ultravox: ${url}`);

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY, // Stick to what was working
            'Authorization': `Bearer ${API_KEY}` // Complement as per requirements
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ultravox API Error (${response.status}): ${errorText}`);
    }

    return response.json();
};

const normalizeData = (callsData, usageData, agentsData) => {
    // Basic stats calculation from usage or calls
    const totals = usageData?.allTime || {};
    const dailyUsage = usageData?.daily || [];

    // Normalize calls
    const normalizedCalls = (callsData.results || []).map(call => ({
        id: call.callId,
        agent_id: call.agentId,
        duration: call.billedDurationSeconds || call.billedDuration || 0,
        status: call.endReason || 'unknown',
        timestamp: call.created,
        summary: call.summary,
        customerPhoneNumber: call.customerPhoneNumber
    }));

    // Step 5 structure: totalCalls, totalMinutes, successCalls, failedCalls, callsPerAgent, agents, calls
    return {
        totalCalls: totals.totalCount || normalizedCalls.length,
        totalMinutes: (totals.billedMinutes || 0).toFixed(2),
        successCalls: normalizedCalls.filter(c => c.status === 'normal' || c.status === 'agent_ended').length,
        failedCalls: normalizedCalls.filter(c => c.status !== 'normal' && c.status !== 'agent_ended').length,
        callsPerAgent: {}, // Can be calculated if needed
        agents: agentsData.results || [],
        calls: normalizedCalls,
        dailyUsage: dailyUsage
    };
};

app.get('/api/dashboard-summary', async (req, res) => {
    try {
        const now = Date.now();
        if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
            console.log('[Backend] Serving from cache');
            return res.json(cache.data);
        }

        console.log('[Backend] Fetching fresh data...');
        // Step 3: Parallel aggregation
        const [callsData, usageData, agentsData] = await Promise.all([
            fetchUltravox('/calls?pageSize=100'), // Quick first page
            fetchUltravox('/accounts/me/usage/calls'),
            fetchUltravox('/agents')
        ]);

        const normalized = normalizeData(callsData, usageData, agentsData);

        cache.data = normalized;
        cache.timestamp = now;

        res.json(normalized);
    } catch (error) {
        console.error('[Backend] Aggregation Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Backend] Aggregator running on http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Ajustado a 3000 por solicitud
const API_KEY = process.env.VITE_ULTRAVOX_KEY || 'MnO6Ztj0.GgITCvEoij1dLRgGTFWemaNCwZtHhZ9c';
const BASE_URL = 'https://api.ultravox.ai/api';

app.use(cors());
app.use(express.json());

// --- AGGREGATOR LOGIC (Integrated from server_aggregator.js) ---
let globalCache = {
    callsData: { results: [] },
    usageData: {},
    agentsData: {},
    isInitialLoaded: false
};

let syncInProgress = false;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchUltravox = async (endpoint, retries = 3) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                    'Authorization': `Bearer ${API_KEY}`
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 429) {
                    await sleep(Math.pow(2, i) * 2000);
                    continue;
                }
                throw new Error(`Ultravox Error: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            if (i === retries - 1) throw err;
            await sleep(2000);
        }
    }
};

const normalizeData = (callsData, usageData, agentsData) => {
    const totals = usageData?.allTime || {};
    const dailyUsage = usageData?.daily || [];

    const normalizedCalls = (callsData.results || []).map(call => {
        let rawReason = call.endReason || 'unknown';
        let reason = String(rawReason).toLowerCase();
        const successKeywords = ['normal', 'ended', 'hangup', 'completed', 'success', 'hung'];
        const isSuccess = successKeywords.some(k => reason.includes(k));
        let finalReason = isSuccess ? 'completed' : reason;

        let phone = 'Oculto';
        if (call.customerPhoneNumber) phone = call.customerPhoneNumber;

        let meta = call.metadata || {};
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }

        if (phone === 'Oculto') {
            phone = meta['ultravox.sip.caller_id'] ||
                meta['ultravox.sip.from_display_name'] ||
                meta['caller_id'] ||
                meta['phone'] ||
                'Oculto';
        }

        if (phone === 'Oculto' && call.requestContext?.ultravox?.sip?.caller_id) {
            phone = call.requestContext.ultravox.sip.caller_id;
        }

        if (phone === 'Oculto' && meta['ultravox.sip.from_uri']) {
            const match = meta['ultravox.sip.from_uri'].match(/sip:([^@]+)@/);
            if (match) phone = match[1];
        }

        return {
            callId: call.callId,
            agentId: call.agentId,
            billedDuration: call.billedDurationSeconds || call.billedDuration || 0,
            endReason: finalReason,
            state: call.state,
            created: call.created,
            summary: call.summary,
            customerPhoneNumber: phone,
            recordingUrl: call.recordingUrl
        };
    });

    const successList = normalizedCalls.filter(c => c.endReason === 'completed');

    return {
        totalCalls: totals.totalCount || normalizedCalls.length,
        totalMinutes: (totals.billedMinutes || 0).toFixed(2),
        successCalls: successList.length,
        failedCalls: normalizedCalls.length - successList.length,
        callsPerAgent: {},
        agents: (agentsData.results || []).map(a => ({ id: a.agentId, name: a.name })),
        calls: normalizedCalls,
        dailyUsage: dailyUsage,
        isSyncing: syncInProgress
    };
};

const triggerFullSync = async () => {
    if (syncInProgress) return;
    syncInProgress = true;
    console.log('[Aggregator] Starting full history sync...');
    try {
        let nextUrl = '/calls?pageSize=1000';
        let safetyCounter = 0;
        while (nextUrl && safetyCounter < 1000) {
            const data = await fetchUltravox(nextUrl);
            if (data.results && data.results.length > 0) {
                const map = new Map();
                globalCache.callsData.results.forEach(c => map.set(c.callId, c));
                data.results.forEach(c => map.set(c.callId, c));
                globalCache.callsData.results = Array.from(map.values()).sort((a, b) => new Date(b.created) - new Date(a.created));
                console.log(`[Aggregator] Sync progress: ${globalCache.callsData.results.length} calls`);
            }
            nextUrl = data.next || null;
            safetyCounter++;
            await sleep(1000);
        }
        console.log('[Aggregator] Full sync complete.');
    } catch (err) {
        console.error('[Aggregator] Sync Error:', err);
    } finally {
        syncInProgress = false;
    }
};

const triggerRealTimePoll = async () => {
    try {
        const [recentCalls, usage, agents] = await Promise.all([
            fetchUltravox('/calls?pageSize=50'),
            fetchUltravox('/accounts/me/usage/calls'),
            fetchUltravox('/agents')
        ]);
        if (recentCalls.results) {
            const map = new Map();
            globalCache.callsData.results.forEach(c => map.set(c.callId, c));
            recentCalls.results.forEach(c => map.set(c.callId, c));
            globalCache.callsData.results = Array.from(map.values()).sort((a, b) => new Date(b.created) - new Date(a.created));
        }
        globalCache.usageData = usage;
        globalCache.agentsData = agents;
        globalCache.isInitialLoaded = true;
    } catch (err) {
        console.error('[Aggregator] Polling Error:', err);
    }
};

// --- ENDPOINTS ---
app.get('/api/dashboard-summary', async (req, res) => {
    // Return data even if syncing
    const data = normalizeData(globalCache.callsData, globalCache.usageData, globalCache.agentsData);
    res.json(data);
});

// Serve static files from React build (Ahora en la misma carpeta en Docker)
const buildPath = path.resolve(__dirname, 'dist');
console.log(`[Server] Serving static files from: ${buildPath}`);
app.use(express.static(buildPath));

app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`[Server] Error sending index.html from ${indexPath}:`, err);
            res.status(404).send("Frontend build not found. Make sure 'npm run build' was successful.");
        }
    });
});

// Initialization
app.listen(PORT, async () => {
    console.log(`[Server] Dashboard running on port ${PORT}`);
    console.log('[Server] Initializing aggregator...');
    await triggerRealTimePoll();
    triggerFullSync(); // Background
    setInterval(triggerRealTimePoll, 10000);
});

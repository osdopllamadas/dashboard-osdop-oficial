// El API Key debería venir de variables de entorno en producción (ej. process.env.VITE_ULTRAVOX_KEY)
const API_KEY = process.env.VITE_ULTRAVOX_KEY || 'MnO6Ztj0.GgITCvEoij1dLRgGTFWemaNCwZtHhZ9c';
const BASE_URL = 'https://api.ultravox.ai/api';

let globalCache = {
    callsData: { results: [] },
    usageData: {},
    agentsData: {},
    isInitialLoaded: false
};

let syncInProgress = false;
let isAggregatorRunning = false;

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
        // --- NORMALIZACIÓN DE ESTADO ---
        let rawReason = call.endReason || 'unknown';
        let reason = String(rawReason).toLowerCase();

        const successKeywords = ['normal', 'ended', 'hangup', 'completed', 'success', 'hung'];
        const isSuccess = successKeywords.some(k => reason.includes(k));

        // El frontend espera: 'normal', 'agent_ended', 'hangup', 'completed' para contarlos como éxito
        let finalReason = isSuccess ? 'completed' : reason;

        // --- NORMALIZACIÓN DE TELÉFONO (Extracción Profunda) ---
        let phone = 'Oculto';

        // 1. Campo directo
        if (call.customerPhoneNumber) phone = call.customerPhoneNumber;

        // 2. Metadata (Intentar parsear si es string, o usar si es objeto)
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

        // 3. RequestContext SIP
        if (phone === 'Oculto' && call.requestContext?.ultravox?.sip?.caller_id) {
            phone = call.requestContext.ultravox.sip.caller_id;
        }

        // 4. SIP Header Parsing (Fallo seguro)
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
            }
            nextUrl = data.next || null;
            safetyCounter++;
            await sleep(1000); // Evitar saturación
        }
    } catch (err) {
        console.error('[Aggregator] Full Sync Error:', err);
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

export const dashboardAggregator = async () => {
    if (!isAggregatorRunning) {
        isAggregatorRunning = true;
        triggerRealTimePoll().then(() => triggerFullSync());
        setInterval(triggerRealTimePoll, 10000);
    }

    let waitCounter = 0;
    while (!globalCache.isInitialLoaded && waitCounter < 10) {
        await sleep(500);
        waitCounter++;
    }

    // DEBUG LOG
    if (globalCache.callsData.results.length > 0) {
        const first = globalCache.callsData.results[0];
        console.log(`[Aggregator Debug] ID: ${first.callId} | Original Reason: ${first.endReason} | Phone: ${normalizeData({ results: [first] }, {}, {}).calls[0].customerPhoneNumber}`);
    }

    return normalizeData(globalCache.callsData, globalCache.usageData, globalCache.agentsData);
};

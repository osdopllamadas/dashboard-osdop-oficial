import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import sqlite3Lib from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Supabase Client AFTER dotenv.config()
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Database] Supabase client initialized.');
} else {
    console.warn('[Database] ⚠️ Supabase credentials not found. CRM features will be disabled.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// API Key strictly from environment variable with NO hardcoded fallbacks
const API_KEY = process.env.ULTRAVOX_API_KEY || process.env.VITE_ULTRAVOX_KEY;
const BASE_URL = 'https://api.ultravox.ai/api';

if (!API_KEY) {
    console.warn('[Server] WARNING: ULTRAVOX_API_KEY is not defined in the environment variables.');
}

// Secure CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS policy (Unauthorized Origin)'));
        }
    }
}));

app.use(express.json());

// --- RATE LIMITING MIDDLEWARE (AUTO-CONTAINED) ---
const ipLimits = new Map();

// Periodic cleanup every 5 minutes to prevent memory leak of stale IPs
setInterval(() => {
    const now = Date.now();
    for (const [ip, requests] of ipLimits.entries()) {
        const validRequests = requests.filter(timestamp => now - timestamp < 60000);
        if (validRequests.length === 0) {
            ipLimits.delete(ip);
        } else {
            ipLimits.set(ip, validRequests);
        }
    }
}, 5 * 60 * 1000);

const rateLimiter = (limit = 60, windowMs = 60000) => {
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();
        
        if (!ipLimits.has(ip)) {
            ipLimits.set(ip, []);
        }
        
        // Filter out timestamps outside the sliding time-window
        let requests = ipLimits.get(ip).filter(timestamp => now - timestamp < windowMs);
        
        if (requests.length >= limit) {
            console.warn(`[RateLimiter] Blocked IP: ${ip} (Exceeded ${limit} reqs/min)`);
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
        
        requests.push(now);
        ipLimits.set(ip, requests);
        next();
    };
};

// Protect all /api/ endpoints with a limit of 60 requests per minute
app.use('/api/', rateLimiter(60, 60000));

// --- AUTH LAYER (HMAC-SHA256 signed tokens via Node.js crypto) ---
const AUTH_SECRET = process.env.AUTH_SECRET || 'FALLBACK_SECRET_CHANGE_ME';

const signToken = (payload) => {
    const data = JSON.stringify(payload);
    const b64 = Buffer.from(data).toString('base64url');
    const sig = crypto.createHmac('sha256', AUTH_SECRET).update(b64).digest('base64url');
    return `${b64}.${sig}`;
};

const verifyToken = (token) => {
    try {
        const [b64, sig] = token.split('.');
        const expected = crypto.createHmac('sha256', AUTH_SECRET).update(b64).digest('base64url');
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(b64, 'base64url').toString());
        if (payload.exp && Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
};

// Utility: hash a password using scryptSync for strong brute-force protection
const hashPassword = (password) => {
    // We use AUTH_SECRET as a robust static salt. scrypt makes brute-force attacks extremely expensive.
    return crypto.scryptSync(String(password), AUTH_SECRET, 64).toString('hex');
};

// --- AUTH MIDDLEWARES ---
const requireAuth = async (req, res, next) => {
    try {
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const token = auth.slice(7);
        const payload = verifyToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        
        // Dynamic Check: Ensure user still exists, is active, and fetch real-time role
        const user = await dbGet('SELECT status, role FROM users WHERE id = ?', [payload.id]);
        if (!user || user.status !== 'active') {
            return res.status(403).json({ error: 'Account is inactive or disabled.' });
        }
        
        // Update payload with fresh role in case it was changed mid-session by an admin
        payload.role = user.role;
        req.user = payload;
        next();
    } catch (err) {
        console.error('[Auth] requireAuth error:', err);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

const requireAdmin = (req, res, next) => {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }
        next();
    });
};

const requireRole = (...roles) => (req, res, next) => {
    requireAuth(req, res, () => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}.` });
        }
        next();
    });
};

// POST /api/auth/login — validate credentials from DB users table
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const userRow = await dbGet(
            `SELECT * FROM users WHERE username = ? AND status = 'active'`,
            [username]
        );

        if (!userRow || userRow.password_hash !== hashPassword(password)) {
            console.warn(`[Auth] ⚠️ Failed login attempt for username: "${username}"`);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = signToken({
            id: userRow.id,
            username: userRow.username,
            role: userRow.role,
            exp: Date.now() + 1000 * 60 * 60 * 8 // 8-hour session
        });

        console.log(`[Auth] ✅ Login success: ${userRow.username} (${userRow.role})`);
        res.json({ token, username: userRow.username, role: userRow.role });
    } catch (err) {
        console.error('[Auth] Login DB error:', err.message);
        res.status(500).json({ error: 'Authentication service error.' });
    }
});

// GET /api/auth/validate — verify token on page reload
app.get('/api/auth/validate', (req, res) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided.' });
    }
    const token = auth.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    res.json({ id: payload.id, username: payload.username, role: payload.role });
});

// --- DATABASE PERSISTENCE LAYER (SQLITE3) ---
const sqlite3 = sqlite3Lib.verbose();
const dbDir = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dashboard.db');
let syncInProgress = false;
let isAggregatorRunning = false;

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[Database] Failed to connect to SQLite:', err.message);
    } else {
        console.log(`[Database] SQLite connected successfully at: ${dbPath}`);
        // Enable WAL mode and busy timeout to fix SQLITE_BUSY locking errors
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA busy_timeout = 5000;');
        initTables();
    }
});

// Promise-based SQL helpers for clean async/await syntax
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Seed default admin user if the users table is empty on first run
const seedDefaultAdmin = async () => {
    try {
        const existing = await dbGet(`SELECT id FROM users LIMIT 1`);
        if (!existing) {
            const defaultPassword = process.env.ADMIN_PASS || 'admin2026';
            const hash = hashPassword(defaultPassword);
            await dbRun(
                `INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)`,
                ['admin', hash, 'admin', 'active']
            );
            console.log('[Database] ✅ Default admin user seeded. Username: admin | Password: from ADMIN_PASS env var');
        } else {
            console.log('[Database] Users table already has data — skipping default seed.');
        }
    } catch (err) {
        console.error('[Database] Seed error:', err.message);
    }
};

// Initialize schema and indices
const initTables = async () => {
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT
            )
        `);
        
        await dbRun(`
            CREATE TABLE IF NOT EXISTS calls (
                callId TEXT PRIMARY KEY,
                agentId TEXT,
                billedDuration REAL,
                endReason TEXT,
                state TEXT,
                created TEXT,
                summary TEXT,
                customerPhoneNumber TEXT,
                recordingUrl TEXT,
                transcript TEXT,
                FOREIGN KEY(agentId) REFERENCES agents(id)
            )
        `);

        // Index on creation date descending for ultra-fast historical sort
        await dbRun(`
            CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(created DESC)
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS usage_daily (
                date TEXT PRIMARY KEY,
                callsCount INTEGER,
                billedMinutes REAL
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS usage_totals (
                key TEXT PRIMARY KEY,
                totalCount INTEGER,
                billedMinutes REAL
            )
        `);

        // --- FASE 4: Usuarios, Auditoría y Afiliaciones ---
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'operator',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS affiliations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                callId TEXT,
                phone TEXT,
                status TEXT NOT NULL DEFAULT 'pendiente',
                interested INTEGER NOT NULL DEFAULT 0,
                missing_info TEXT,
                reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(callId) REFERENCES calls(callId)
            )
        `);

        console.log('[Database] ✅ SQLite Database Schema initialized successfully (Fase 4 tables included).');

        // Seed default admin user on first run
        await seedDefaultAdmin();

        // Safely trigger aggregator AFTER database is confirmed online
        startAggregator();
    } catch (err) {
        console.error('[Database] Table initialization error:', err.message);
    }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchUltravox = async (endpoint, retries = 3) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const timeout = 30000;
    
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
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
                    const waitTime = Math.pow(2, i) * 2000;
                    console.warn(`[Aggregator] 429 Rate Limited. Retrying in ${waitTime}ms...`);
                    await sleep(waitTime);
                    continue;
                }
                throw new Error(`Ultravox Error: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                console.error(`[Aggregator] Timeout reached for ${endpoint} (${timeout}ms)`);
            } else {
                console.error(`[Aggregator] Fetch error for ${endpoint}:`, err.message);
            }

            if (i === retries - 1) throw err;
            const waitTime = Math.pow(2, i) * 1000;
            console.log(`[Aggregator] Retrying ${endpoint} in ${waitTime}ms... (Attempt ${i + 1}/${retries})`);
            await sleep(waitTime);
        }
    }
};

const normalizeSingleCall = (call) => {
    let rawReason = call.endReason;
    let finalReason = null;

    if (rawReason) {
        let reason = String(rawReason).toLowerCase();
        const successKeywords = ['normal', 'ended', 'hangup', 'completed', 'success', 'hung'];
        const isSuccess = successKeywords.some(k => reason.includes(k));
        finalReason = isSuccess ? 'completed' : reason;
    } else if (call.state === 'ended' || call.state === 'ended-no-recording') {
        finalReason = 'unknown';
    }

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

    const rawDur = call.billedDurationSeconds || call.billedDuration || 0;
    const durationSeconds = typeof rawDur === 'string' ? parseFloat(rawDur.replace('s', '')) : rawDur;

    return {
        callId: call.callId,
        agentId: call.agentId,
        billedDuration: isNaN(durationSeconds) ? 0 : durationSeconds,
        endReason: finalReason,
        state: call.state,
        created: call.created,
        summary: call.summary,
        customerPhoneNumber: phone,
        recordingUrl: call.recordingUrl || (call.state === 'ended' ? `/api/call-recording?id=${call.callId}` : null),
        transcript: call.transcript
    };
};

// --- AFFILIATION ANALYZER (Pattern matching on transcripts/summaries) ---
const analyzeCallForAffiliation = async (normalizedCall) => {
    const text = [
        normalizedCall.summary || '',
        normalizedCall.transcript || ''
    ].join(' ').toLowerCase();

    if (!text.trim()) return; // nothing to analyze

    // Already processed?
    const existing = await dbGet(`SELECT id FROM affiliations WHERE callId = ?`, [normalizedCall.callId]);
    if (existing) return;

    // --- Detect interest in affiliation ---
    const affiliationKeywords = [
        'afili', 'asociar', 'inscrib', 'registrar', 'unirme', 'quiero ser socio',
        'quiero anotarme', 'incorporarme', 'alta como', 'darme de alta'
    ];
    const interested = affiliationKeywords.some(k => text.includes(k)) ? 1 : 0;

    // --- Detect reason/motivo of the call ---
    let reason = 'Consulta general';
    if (text.includes('turno') || text.includes('cita') || text.includes('reserva')) {
        reason = 'Solicitud de turno';
    } else if (text.includes('afili') || text.includes('asociar') || text.includes('alta')) {
        reason = 'Consulta de afiliación';
    } else if (text.includes('reclamo') || text.includes('queja') || text.includes('problema')) {
        reason = 'Reclamo / Queja';
    } else if (text.includes('emergencia') || text.includes('urgencia') || text.includes('urgente')) {
        reason = 'Emergencia';
    } else if (text.includes('derivar') || text.includes('transferir') || text.includes('pasarme')) {
        reason = 'Solicitud de derivación';
    } else if (text.includes('informaci') || text.includes('consulta') || text.includes('saber')) {
        reason = 'Pedido de información';
    } else if (text.includes('pago') || text.includes('factura') || text.includes('cuota')) {
        reason = 'Consulta de pago';
    }

    // --- Detect missing information ---
    const missingParts = [];
    if (normalizedCall.customerPhoneNumber === 'Oculto' || !normalizedCall.customerPhoneNumber) {
        missingParts.push('Teléfono');
    }
    const hasName = /me llamo|mi nombre es|soy [a-záéíóú]+/i.test(text);
    if (!hasName && interested) missingParts.push('Nombre');
    const hasDni = /dni|documento|cuit|cuil/.test(text);
    if (!hasDni && interested) missingParts.push('DNI/Documento');
    const missing_info = missingParts.length > 0 ? missingParts.join(', ') : null;

    // Only persist calls with meaningful signals (interested OR has reason beyond generic)
    if (!interested && reason === 'Consulta general') return;

    await dbRun(
        `INSERT OR IGNORE INTO affiliations (callId, phone, status, interested, missing_info, reason) VALUES (?, ?, 'pendiente', ?, ?, ?)`,
        [normalizedCall.callId, normalizedCall.customerPhoneNumber, interested, missing_info, reason]
    );

    if (interested) {
        console.log(`[Affiliations] 🌟 Potential affiliate detected — Call: ${normalizedCall.callId} | Phone: ${normalizedCall.customerPhoneNumber} | Missing: ${missing_info || 'none'}`);
    }
};

const triggerFullSync = async () => {
    if (syncInProgress) return;
    syncInProgress = true;
    console.log('[Aggregator] Starting database synchronization from Ultravox history...');
    try {
        let nextUrl = '/calls?pageSize=1000';
        let safetyCounter = 0;
        
        while (nextUrl && safetyCounter < 1000) {
            const data = await fetchUltravox(nextUrl);
            if (data.results && data.results.length > 0) {
                // Heavy page syncing executed inside a high-speed SQLite Transaction
                await new Promise((resolve, reject) => {
                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        const stmt = db.prepare(`
                            INSERT OR REPLACE INTO calls (
                                callId, agentId, billedDuration, endReason, state, created, summary, customerPhoneNumber, recordingUrl, transcript
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        for (const call of data.results) {
                            const c = normalizeSingleCall(call);
                            stmt.run([
                                c.callId, c.agentId, c.billedDuration, c.endReason, c.state, c.created, c.summary, c.customerPhoneNumber, c.recordingUrl, c.transcript
                            ]);
                        }
                        
                        stmt.finalize();
                        db.run("COMMIT", (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                });
                console.log(`[Aggregator] Synced ${data.results.length} calls to SQLite.`);
            }
            nextUrl = data.next || null;
            safetyCounter++;
            await sleep(1000);
        }
        console.log('[Aggregator] Database full history sync completed.');
    } catch (err) {
        console.error('[Aggregator] Full Sync SQL Error:', err.message);
    } finally {
        syncInProgress = false;
    }
};

const triggerRealTimePoll = async () => {
    try {
        // Sequentialize remote API calls to respect client connection thresholds cleanly
        const recentCalls = await fetchUltravox('/calls?pageSize=25');
        const usage = await fetchUltravox('/accounts/me/usage/calls');
        const agents = await fetchUltravox('/agents');

        // 1. Save recent calls
        if (recentCalls.results && recentCalls.results.length > 0) {
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    const stmt = db.prepare(`
                        INSERT OR REPLACE INTO calls (
                            callId, agentId, billedDuration, endReason, state, created, summary, customerPhoneNumber, recordingUrl, transcript
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    for (const call of recentCalls.results) {
                        const c = normalizeSingleCall(call);
                        stmt.run([
                            c.callId, c.agentId, c.billedDuration, c.endReason, c.state, c.created, c.summary, c.customerPhoneNumber, c.recordingUrl, c.transcript
                        ]);
                    }
                    stmt.finalize();
                    db.run("COMMIT", (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });

            // 4. Analyze each completed call for affiliation signals
            for (const call of recentCalls.results) {
                if (call.state === 'ended' || call.state === 'ended-no-recording') {
                    const normalized = normalizeSingleCall(call);
                    await analyzeCallForAffiliation(normalized).catch(e =>
                        console.error('[Affiliations] Analyzer error:', e.message)
                    );
                }
            }
        }

        // 2. Save agents info
        if (agents.results && agents.results.length > 0) {
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    const stmt = db.prepare(`INSERT OR REPLACE INTO agents (id, name) VALUES (?, ?)`);
                    for (const agent of agents.results) {
                        stmt.run([agent.agentId, agent.name]);
                    }
                    stmt.finalize();
                    db.run("COMMIT", (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }

        // 3. Save usage details
        const totals = usage?.allTime || {};
        const daily = usage?.daily || [];

        await dbRun(`
            INSERT OR REPLACE INTO usage_totals (key, totalCount, billedMinutes) VALUES (?, ?, ?)
        `, ['allTime', totals.totalCount || 0, totals.billedMinutes || 0]);

        for (const d of daily) {
            await dbRun(`
                INSERT OR REPLACE INTO usage_daily (date, callsCount, billedMinutes) VALUES (?, ?, ?)
            `, [d.date, d.count || d.callsCount || 0, d.billedMinutes || 0]);
        }

    } catch (err) {
        console.error('[Aggregator] Polling Database Integration Error:', err.message);
        throw err;
    }
};

const pollWithBackoff = async () => {
    try {
        await triggerRealTimePoll();
        setTimeout(pollWithBackoff, 12000);
    } catch (err) {
        console.warn('[Aggregator] Poll failed, backing off 20 seconds...');
        setTimeout(pollWithBackoff, 20000);
    }
};

const startAggregator = async () => {
    if (!isAggregatorRunning) {
        isAggregatorRunning = true;
        console.log('[Aggregator] Initializing database synchronization...');
        try {
            await triggerRealTimePoll();
            triggerFullSync();
            pollWithBackoff();
        } catch (err) {
            console.error('[Aggregator] Critical initialization failure, retrying background poll shortly...', err.message);
        pollWithBackoff();
        }
    }
};

// --- ENDPOINTS PARA MÓDULOS DEL DASHBOARD ---

// Consultas Generales (Supabase connection)
app.get('/api/consultas_generales', requireAuth, async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ error: 'Supabase no está configurado en el servidor.' });
        }

        const { data, error } = await supabase
            .from('consultas generales')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Supabase] Error fetching consultas generales:', error);
            return res.status(500).json({ error: 'Error consultando la base de datos de consultas.' });
        }

        // Procesar datos para los KPIs
        const totalConsultas = data.length;
        const exitosas = data.filter(d => d['estado de la llamada'] === 'Exitosa').length;
        const noExisten = data.filter(d => {
            const estado = d['estado de la llamada'] ? d['estado de la llamada'].toLowerCase() : '';
            return estado.includes('no exist') || estado.includes('desconocid');
        }).length;

        // Agrupar tipos de consultas para el gráfico
        const tiposMap = {};
        data.forEach(item => {
            let tipo = item['tipo de consulta'] || 'Sin clasificar';
            tiposMap[tipo] = (tiposMap[tipo] || 0) + 1;
        });

        const chartData = Object.keys(tiposMap).map(key => ({
            name: key,
            value: tiposMap[key]
        })).sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

        res.json({
            kpis: {
                total: totalConsultas,
                exitosas: exitosas,
                noExisten: noExisten
            },
            chartData: chartData,
            recentQueries: data // enviamos toda la lista (o las primeras) para la tabla inferior
        });
    } catch (err) {
        console.error('[API] Error en /api/consultas_generales:', err.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// 1. Dashboard summary aggregation endpoint powered entirely by SQLite (Zero memory leakage)
app.get('/api/dashboard-summary', async (req, res) => {
    try {
        // Query agents
        const agentsList = await dbAll(`SELECT id, name FROM agents`);
        
        // Fetch up to 1000 calls ordered by creation descending to preserve server/client memory footprint
        const callsList = await dbAll(`SELECT * FROM calls ORDER BY created DESC LIMIT 1000`);

        // Fetch daily usage
        const dailyList = await dbAll(`SELECT date, callsCount as count, billedMinutes FROM usage_daily ORDER BY date ASC`);

        // Fetch totals
        const totalsRow = await dbGet(`SELECT totalCount, billedMinutes FROM usage_totals WHERE key = 'allTime'`);
        const totalCallsCount = totalsRow ? totalsRow.totalCount : callsList.length;
        const totalMinutes = totalsRow ? totalsRow.billedMinutes : callsList.reduce((acc, c) => acc + c.billedDuration / 60, 0);

        // Fetch count of successful completed calls
        const successCallsCountRow = await dbGet(`SELECT COUNT(*) as count FROM calls WHERE endReason = 'completed'`);
        const successCalls = successCallsCountRow ? successCallsCountRow.count : 0;
        
        const responseData = {
            totalCalls: totalCallsCount,
            totalMinutes: parseFloat(totalMinutes).toFixed(2),
            successCalls: successCalls,
            failedCalls: Math.max(0, totalCallsCount - successCalls),
            callsPerAgent: {},
            agents: agentsList,
            calls: callsList,
            dailyUsage: dailyList,
            isSyncing: syncInProgress
        };

        res.json(responseData);
    } catch (error) {
        console.error('[Server] SQL aggregation summary error:', error.message);
        res.status(500).json({ error: 'Failed to aggregate dashboard data from database.' });
    }
});

// 2. Call details endpoint utilizing SQLite as primary Cache layer
app.get('/api/call-detail', async (req, res) => {
    const callId = req.query.id;
    if (!callId) {
        return res.status(400).json({ error: 'Missing required query parameter: id' });
    }
    try {
        // Step 1: Query local Cache first
        const cachedCall = await dbGet(`SELECT * FROM calls WHERE callId = ?`, [callId]);
        
        // If cached and has full processed transcript/summary
        if (cachedCall && cachedCall.transcript && cachedCall.summary) {
            return res.json(cachedCall);
        }

        // Step 2: Fallback to remote API fetch if cache miss or call is incomplete
        const call = await fetchUltravox(`/calls/${callId}`);
        if (call && call.callId) {
            const normalized = normalizeSingleCall(call);
            // Save immediately to SQLite Cache
            await dbRun(`
                INSERT OR REPLACE INTO calls (
                    callId, agentId, billedDuration, endReason, state, created, summary, customerPhoneNumber, recordingUrl, transcript
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                normalized.callId, normalized.agentId, normalized.billedDuration, normalized.endReason, normalized.state, normalized.created, normalized.summary, normalized.customerPhoneNumber, normalized.recordingUrl, normalized.transcript
            ]);
            res.json(normalized);
        } else {
            res.status(404).json({ error: 'Call not found' });
        }
    } catch (error) {
        console.error(`[Server] Call Detail SQL/Fetch Error for ${callId}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. Call recording signed url redirector endpoint
app.get('/api/call-recording', async (req, res) => {
    const callId = req.query.id;
    if (!callId) {
        return res.status(400).json({ error: 'Missing required query parameter: id' });
    }
    try {
        const response = await fetch(`${BASE_URL}/calls/${callId}/recording`, {
            headers: { 
                'X-API-Key': API_KEY,
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch recording info from Ultravox' });
        }

        const data = await response.json();
        if (data && data.recordingUrl) {
            res.writeHead(302, { Location: data.recordingUrl });
            res.end();
        } else {
            res.status(404).json({ error: 'Recording URL not found in Ultravox response.' });
        }
    } catch (error) {
        console.error(`[Server] Call Recording Error for ${callId}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- USER MANAGEMENT ENDPOINTS (Admin only) ---

// Helper: write an entry to audit_logs
const logAudit = async (userId, action, details) => {
    try {
        await dbRun(
            `INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)`,
            [userId, action, typeof details === 'object' ? JSON.stringify(details) : String(details)]
        );
    } catch (err) {
        console.error('[Audit] Failed to write audit log:', err.message);
    }
};

// GET /api/users — list all users, no password_hash (admin only)
app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const users = await dbAll(
            `SELECT id, username, role, status, created_at FROM users ORDER BY created_at ASC`
        );
        res.json(users);
    } catch (err) {
        console.error('[Users] GET /api/users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// POST /api/users — create a new user (admin only)
app.post('/api/users', requireAdmin, async (req, res) => {
    const { username, password, role } = req.body || {};
    const validRoles = ['admin', 'supervisor', 'operator'];

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'username, password and role are required.' });
    }
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}.` });
    }

    try {
        const existing = await dbGet(`SELECT id FROM users WHERE username = ?`, [username]);
        if (existing) {
            return res.status(409).json({ error: `Username "${username}" is already taken.` });
        }

        const hash = hashPassword(password);
        const result = await dbRun(
            `INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, 'active')`,
            [username, hash, role]
        );

        await logAudit(req.user.id, 'USER_CREATED', { newUserId: result.lastID, username, role });
        console.log(`[Users] ✅ User "${username}" (${role}) created by admin "${req.user.username}"`);
        res.status(201).json({ id: result.lastID, username, role, status: 'active' });
    } catch (err) {
        console.error('[Users] POST /api/users error:', err.message);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// PUT /api/users/:id — update username, password, role or status (admin only)
app.put('/api/users/:id', requireAdmin, async (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    const { username, password, role, status } = req.body || {};
    const validRoles = ['admin', 'supervisor', 'operator'];
    const validStatuses = ['active', 'inactive'];

    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}.` });
    }
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}.` });
    }

    try {
        const targetUser = await dbGet(`SELECT * FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const updates = [];
        const params = [];
        if (username) { updates.push('username = ?'); params.push(username); }
        if (password) { updates.push('password_hash = ?'); params.push(hashPassword(password)); }
        if (role)     { updates.push('role = ?');          params.push(role); }
        if (status)   { updates.push('status = ?');        params.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        params.push(targetId);
        await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        await logAudit(req.user.id, 'USER_UPDATED', {
            targetUserId: targetId,
            targetUsername: targetUser.username,
            changes: { username, role, status, passwordChanged: !!password }
        });
        console.log(`[Users] ✅ User id:${targetId} updated by admin "${req.user.username}"`);
        res.json({ message: 'User updated successfully.' });
    } catch (err) {
        console.error(`[Users] PUT /api/users/${targetId} error:`, err.message);
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

// DELETE /api/users/:id — soft-disable user (admin only, cannot self-disable)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    const targetId = parseInt(req.params.id, 10);

    if (targetId === req.user.id) {
        return res.status(400).json({ error: 'You cannot disable your own account.' });
    }

    try {
        const targetUser = await dbGet(`SELECT * FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (targetUser.status === 'inactive') {
            return res.status(400).json({ error: 'User is already inactive.' });
        }

        await dbRun(`UPDATE users SET status = 'inactive' WHERE id = ?`, [targetId]);
        await logAudit(req.user.id, 'USER_DISABLED', {
            targetUserId: targetId,
            targetUsername: targetUser.username
        });
        console.log(`[Users] ⚠️ User "${targetUser.username}" (id:${targetId}) disabled by admin "${req.user.username}"`);
        res.json({ message: `User "${targetUser.username}" has been disabled.` });
    } catch (err) {
        console.error(`[Users] DELETE /api/users/${targetId} error:`, err.message);
        res.status(500).json({ error: 'Failed to disable user.' });
    }
});

// GET /api/audit-logs — last 200 audit log entries (admin only)
app.get('/api/audit-logs', requireAdmin, async (req, res) => {
    try {
        const logs = await dbAll(`
            SELECT al.id, al.action, al.details, al.created_at, u.username AS performed_by
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 200
        `);
        res.json(logs);
    } catch (err) {
        console.error('[Audit] GET /api/audit-logs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch audit logs.' });
    }
});

// --- AFFILIATIONS CRM ENDPOINTS ---

// GET /api/affiliations — list all affiliation records (all authenticated roles)
app.get('/api/affiliations', requireAuth, async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized.' });
        const { status } = req.query;
        
        let query = supabase.from('afiliados_interesados').select('*').order('created_at', { ascending: false });
        if (status) {
            query = query.eq('crm_status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map columns to match frontend expectations
        const mappedData = (data || []).map(row => ({
            id: row.id,
            created_at: row.created_at,
            phone: row.telefono,
            reason: row['motivo consulta'],
            interested: row['estado de llamada'] === 'Exitosa' || (row['motivo consulta'] && row['motivo consulta'].toLowerCase().includes('interesado')) ? 1 : 0,
            status: row.crm_status || 'pendiente',
            nombre: row.nombre,
            dni: row.dni,
            localidad: row.localidad,
            motivo_finalizacion: row['motivo de finalizacion'],
            estado_llamada: row['estado de llamada'],
            tipo_tramite: row['tipo de tramite']
        }));

        res.json(mappedData);
    } catch (err) {
        console.error('[Affiliations] GET /api/affiliations error:', err.message);
        res.status(500).json({ error: 'Failed to fetch affiliations.' });
    }
});

// GET /api/affiliations/stats — KPI summary for the CRM dashboard
app.get('/api/affiliations/stats', requireAuth, async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Supabase not initialized.' });
        
        const { data, error } = await supabase.from('afiliados_interesados').select('*');
        if (error) throw error;

        let total = 0;
        let interested = 0;
        let pendiente = 0;
        let contactado = 0;
        let descartado = 0;

        (data || []).forEach(row => {
            total++;
            const isInterested = row['estado de llamada'] === 'Exitosa' || (row['motivo consulta'] && row['motivo consulta'].toLowerCase().includes('interesado'));
            if (isInterested) interested++;
            const stat = row.crm_status || 'pendiente';
            if (stat === 'pendiente') pendiente++;
            if (stat === 'contactado') contactado++;
            if (stat === 'descartado') descartado++;
        });

        res.json({
            total,
            interested,
            pendiente,
            contactado,
            descartado,
            topReasons: [] // We can omit this or compute in memory if needed
        });
    } catch (err) {
        console.error('[Affiliations] GET /api/affiliations/stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch affiliation stats.' });
    }
});

// PUT /api/affiliations/:id/status — update management status (operator and above)
app.put('/api/affiliations/:id/status', requireRole('admin', 'supervisor', 'operator'), async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized.' });
    
    const affId = req.params.id; // Usually UUID or integer depending on Supabase
    const { status } = req.body || {};
    const validStatuses = ['pendiente', 'contactado', 'descartado'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}.` });
    }

    try {
        const { data, error } = await supabase
            .from('afiliados_interesados')
            .update({ crm_status: status })
            .eq('id', affId)
            .select();
            
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Affiliation record not found.' });
        }

        console.log(`[Affiliations] ✅ Record id:${affId} status → "${status}" by user "${req.user.username}"`);
        res.json({ message: 'Status updated.', id: affId, status });
    } catch (err) {
        console.error(`[Affiliations] PUT /api/affiliations/${affId}/status error:`, err.message);
        res.status(500).json({ error: 'Failed to update affiliation status.' });
    }
});

// --- AI STRATEGIC ANALYST (REAL INTEGRATION) ---
app.post('/api/ai/analyze', requireAuth, async (req, res) => {
    try {
        const { model, timeRange, apiKey } = req.body;
        console.log(`[AI Analyst] Running strategic analysis using model: ${model}, range: ${timeRange} days`);

        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return res.status(400).json({ error: 'Debes proporcionar una API Key válida.' });
        }

        // 1. Determinar el límite de fecha
        let dateFilter = '';
        const params = [];
        if (timeRange && timeRange !== 'all') {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - parseInt(timeRange));
            dateFilter = 'WHERE created >= ?';
            params.push(dateLimit.toISOString());
        }

        // 2. Extraer transcripciones reales desde SQLite
        const calls = await new Promise((resolve, reject) => {
            const query = `SELECT callId, created, endReason, summary, transcript FROM calls ${dateFilter} ORDER BY created DESC LIMIT 30`;
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!calls || calls.length === 0) {
            return res.status(400).json({ error: 'No hay suficientes llamadas en este rango de tiempo para analizar.' });
        }

        // 3. Preparar el contexto para la IA
        const transcriptContext = calls.map((c, index) => {
            return `--- LLAMADA #${index + 1} (ID: ${c.callId}) ---\nResultado: ${c.endReason}\nResumen: ${c.summary}\nTranscripción:\n${c.transcript}\n`;
        }).join('\n\n');

        // 4. Construir el Prompt Estructurado
        const prompt = `
Eres un Analista Estratégico de IA experto en optimizar agentes de voz conversacionales.
A continuación te presento un conjunto de transcripciones de llamadas recientes de nuestra obra social OSDOP.

Tu tarea es analizar las interacciones, detectar patrones de fricción, fallos de empatía, tiempos de respuesta, resolución de consultas, y retención.

Devuelve tu respuesta EXACTAMENTE y ÚNICAMENTE en el siguiente formato JSON, sin texto adicional (no uses bloques markdown \`\`\`json):
{
  "analyses": [
    {
      "id": "opt_random_unique",
      "category": "Nombre de categoría (ej. Empatía, Retención, Tiempos de Respuesta)",
      "impact": "Alto | Crítico | Medio | Bajo",
      "observation": "Breve observación del problema.",
      "improvement": "Instrucción clara de cómo mejorar el system prompt o la configuración técnica.",
      "score": 85,
      "evidence": "Extracto literal de 1 o 2 líneas de una transcripción específica que demuestra el problema (incluye el ID de la llamada si es posible)."
    }
  ],
  "agentHealthScore": 80,
  "resolutionRate": 75,
  "interruptionRate": 12,
  "avgDurationSecs": 145,
  "trend": "+2.5% vs periodo anterior (inventa algo coherente)"
}

Genera entre 2 y 4 sugerencias de optimización sólidas basadas en la evidencia real. También, estima de forma lógica y numérica (del 0 al 100) la "Tasa de Resolución" (resolutionRate), la "Tasa de Interrupción" (interruptionRate, % de llamadas donde el usuario pisa al agente), y un promedio realista en segundos para "Duración Promedio" (avgDurationSecs) basándote en la longitud de las transcripciones suministradas.

TRANSCRIPCIONES:
${transcriptContext}
`;

        // 5. Llamar a la API correspondiente según el modelo seleccionado
        let jsonText = '';
        const trimmedKey = apiKey.trim();
        const isOpenRouter = trimmedKey.startsWith('sk-or-v1');

        if (model.includes('gemini') && !isOpenRouter) {
            const geminiClient = new GoogleGenAI({ apiKey: trimmedKey });
            const response = await geminiClient.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                }
            });
            jsonText = response.text();
        } else if (model.includes('gpt') || isOpenRouter) {
            // Si es OpenRouter, forzamos usar el SDK de OpenAI con su baseURL
            const clientConfig = { apiKey: trimmedKey };
            if (isOpenRouter) {
                clientConfig.baseURL = 'https://openrouter.ai/api/v1';
                clientConfig.defaultHeaders = {
                    "HTTP-Referer": "http://localhost:5173", // Optional, for including your app on openrouter.ai rankings.
                    "X-Title": "OSDOP Dashboard", // Optional. Shows in rankings on openrouter.ai.
                };
            }
            const openaiClient = new OpenAI(clientConfig);
            
            // Fix model string for OpenRouter if needed
            let finalModel = model;
            if (isOpenRouter) {
                if (model === 'gpt-4o') finalModel = 'openai/gpt-4o';
                else if (model.includes('claude')) finalModel = `anthropic/${model}`;
                else if (model.includes('gemini')) finalModel = `google/${model}`;
            }

            const response = await openaiClient.chat.completions.create({
                model: finalModel,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                response_format: { type: "json_object" }
            });
            jsonText = response.choices[0].message.content;
        } else if (model.includes('claude')) {
            const anthropicClient = new Anthropic({ apiKey: trimmedKey });
            const response = await anthropicClient.messages.create({
                model: model,
                max_tokens: 2000,
                temperature: 0.2,
                system: "Eres un Analista Estratégico de IA experto en optimizar agentes de voz conversacionales. Responde SOLO con un JSON válido y nada más.",
                messages: [{ role: "user", content: prompt }]
            });
            jsonText = response.content[0].text;
        } else {
            return res.status(400).json({ error: 'Modelo de IA no soportado.' });
        }

        // Limpiar posible formato markdown si la IA no obedeció del todo
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

        const result = JSON.parse(jsonText);
        
        // Asignar IDs únicos a las sugerencias
        if (result.analyses) {
            result.analyses.forEach((item, i) => item.id = `ai_opt_${Date.now()}_${i}`);
        }

        res.json(result);
    } catch (err) {
        console.error('[AI Analyst] Error:', err.message);
        if (err.status === 401 || err.message.includes('API key not valid') || err.message.includes('authentication')) {
            return res.status(401).json({ error: 'La API Key proporcionada es inválida o no tiene permisos.' });
        }
        res.status(500).json({ error: 'Error interno del motor de análisis: ' + err.message });
    }
});

// Serving built static files robustly from process.cwd()
const buildPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).send("Frontend static assets not built yet. If running in development, access via the Vite server port.");
        }
    });
});

// --- GLOBAL CENTRAL ERROR HANDLER MIDDLEWARE ---
app.use((err, req, res, next) => {
    console.error('[Global Error Handler] Caught exception:', err.stack || err.message);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
    });
});

app.listen(PORT, async () => {
    console.log(`[Server] Secure SQLite-backed Dashboard running on port ${PORT}`);
});

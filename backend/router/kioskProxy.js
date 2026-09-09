/**
 * D3 Module A Proxy — Kiosk AI Interview + Transcription
 *
 * Sits between the browser and the external Nisarg AI service.
 * Enforces consent BEFORE any clinical data reaches the external service.
 *
 * Preserved transport:
 *   POST /interview  — JSON body  (text answers / session management)
 *   POST /transcribe — multipart/form-data (WAV audio blob)
 *
 * Flow:
 *   Browser → POST /api/kiosk/interview  → consentMiddleware → Nisarg AI
 *   Browser → POST /api/kiosk/transcribe → consentMiddleware → Nisarg AI
 *
 * The external AI base URL is read from NISARG_AI_URL env var,
 * defaulting to the known VPS address.
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { authenticate } = require('../middleware/authMiddleware');
const { requireConsent } = require('../middleware/consentMiddleware');

const NISARG_AI_URL = process.env.NISARG_AI_URL || 'https://vps-nisarg-10gb-bjyqw.aiccloud.online';
const CONSENT_PURPOSE = 'kiosk-consultation';
const CONSENT_DATA_TYPES = ['All'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Makes a proxied HTTP/HTTPS request to the Nisarg AI service.
 * Preserves method, headers, and body.
 * Returns { statusCode, headers, body: Buffer }
 */
function proxyRequest(targetUrl, method, headers, bodyBuffer) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;

        // Strip hop-by-hop headers that must not be forwarded
        const forwardHeaders = { ...headers };
        [
            'host', 'connection', 'authorization',
            'x-forwarded-for', 'x-real-ip', 'transfer-encoding'
        ].forEach(h => delete forwardHeaders[h]);
        forwardHeaders['host'] = parsed.host;
        if (bodyBuffer) {
            forwardHeaders['content-length'] = bodyBuffer.length;
        }

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + (parsed.search || ''),
            method,
            headers: forwardHeaders,
            timeout: 30000
        };

        const proxyReq = lib.request(options, (proxyRes) => {
            const chunks = [];
            proxyRes.on('data', chunk => chunks.push(chunk));
            proxyRes.on('end', () => resolve({
                statusCode: proxyRes.statusCode,
                headers: proxyRes.headers,
                body: Buffer.concat(chunks)
            }));
        });

        proxyReq.on('error', reject);
        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            reject(new Error('Upstream AI service timed out'));
        });

        if (bodyBuffer && bodyBuffer.length > 0) {
            proxyReq.write(bodyBuffer);
        }
        proxyReq.end();
    });
}

// ─── Collect raw body as buffer (needed for both JSON and multipart) ───────────
function rawBodyBuffer(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// ─── POST /api/kiosk/interview ─────────────────────────────────────────────────
// Consent gate: any clinical interview data blocked until consent is GRANTED.
// Transport: JSON POST (same as original direct call from browser)
router.post(
    '/interview',
    authenticate,
    requireConsent({ purpose: CONSENT_PURPOSE, dataTypes: CONSENT_DATA_TYPES }),
    async (req, res) => {
        try {
            const targetUrl = `${NISARG_AI_URL}/interview`;
            // Body is already parsed by express.json() — re-serialize for forwarding
            const bodyStr = JSON.stringify(req.body);
            const bodyBuffer = Buffer.from(bodyStr, 'utf8');

            const { statusCode, headers, body } = await proxyRequest(
                targetUrl, 'POST',
                { 'content-type': 'application/json' },
                bodyBuffer
            );

            // Forward status and safe response headers
            ['content-type', 'x-request-id'].forEach(h => {
                if (headers[h]) res.setHeader(h, headers[h]);
            });

            res.status(statusCode).send(body);
        } catch (err) {
            console.error('[KioskProxy/interview] Error:', err.message);
            res.status(502).json({ message: 'AI interview service unavailable', detail: err.message });
        }
    }
);

// ─── POST /api/kiosk/transcribe ───────────────────────────────────────────────
// Consent gate: raw voice audio blocked until consent is GRANTED.
// Transport: multipart/form-data (WAV audio blob) — PRESERVED exactly.
// We must NOT parse this with express.json(); instead we forward the raw stream.
router.post(
    '/transcribe',
    authenticate,
    requireConsent({ purpose: CONSENT_PURPOSE, dataTypes: CONSENT_DATA_TYPES }),
    async (req, res) => {
        try {
            // Read language query param from the original request
            const lang = req.query.language || req.query.lang || '';
            const targetUrl = `${NISARG_AI_URL}/transcribe${lang ? `?language=${encodeURIComponent(lang)}` : ''}`;

            // Collect the raw multipart body into a buffer
            const bodyBuffer = await rawBodyBuffer(req);

            const forwardHeaders = {};
            // Forward Content-Type (including multipart boundary) unchanged
            if (req.headers['content-type']) {
                forwardHeaders['content-type'] = req.headers['content-type'];
            }

            const { statusCode, headers, body } = await proxyRequest(
                targetUrl, 'POST', forwardHeaders, bodyBuffer
            );

            ['content-type', 'x-request-id'].forEach(h => {
                if (headers[h]) res.setHeader(h, headers[h]);
            });

            res.status(statusCode).send(body);
        } catch (err) {
            console.error('[KioskProxy/transcribe] Error:', err.message);
            res.status(502).json({ message: 'Transcription service unavailable', detail: err.message });
        }
    }
);

module.exports = router;

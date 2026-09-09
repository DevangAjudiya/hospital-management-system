/**
 * D3 Module B Proxy — Document OCR / Devang AI Service
 *
 * Sits between the browser and the external Devang document analysis service.
 * Enforces consent BEFORE any document/clinical data reaches the external service.
 *
 * Preserved transport:
 *   POST /analyze            — multipart/form-data (prescription image/PDF)
 *   POST /analyze-lab-report — multipart/form-data (lab report image/PDF)
 *
 * Flow:
 *   Browser → POST /api/document/analyze?type=prescription|lab
 *           → consentMiddleware → Devang AI
 *
 * DEVANG_AI_URL defaults to the known external address.
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { authenticate } = require('../middleware/authMiddleware');
const { requireConsent } = require('../middleware/consentMiddleware');

const DEVANG_AI_URL = process.env.DEVANG_AI_URL || 'http://15.206.164.15:8000';
const CONSENT_PURPOSE = 'kiosk-consultation';
const CONSENT_DATA_TYPES = ['All'];

// ─── Raw body buffer collector ─────────────────────────────────────────────────
function rawBodyBuffer(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// ─── Generic proxy helper ──────────────────────────────────────────────────────
function proxyRequest(targetUrl, method, headers, bodyBuffer) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;

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
            reject(new Error('Upstream document AI service timed out'));
        });

        if (bodyBuffer && bodyBuffer.length > 0) {
            proxyReq.write(bodyBuffer);
        }
        proxyReq.end();
    });
}

// ─── POST /api/document/analyze ───────────────────────────────────────────────
// Consent gate: document content blocked until consent is GRANTED.
// Transport: multipart/form-data — preserved exactly (no body parsing by Express).
// ?type=prescription  → forwards to /analyze
// ?type=lab           → forwards to /analyze-lab-report
router.post(
    '/analyze',
    authenticate,
    requireConsent({ purpose: CONSENT_PURPOSE, dataTypes: CONSENT_DATA_TYPES }),
    async (req, res) => {
        try {
            const docType = req.query.type === 'lab' ? 'analyze-lab-report' : 'analyze';
            const targetUrl = `${DEVANG_AI_URL}/${docType}`;

            // Collect raw multipart body (do NOT let express parse it)
            const bodyBuffer = await rawBodyBuffer(req);

            const forwardHeaders = {};
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
            console.error('[DocumentProxy/analyze] Error:', err.message);
            res.status(502).json({ message: 'Document AI service unavailable', detail: err.message });
        }
    }
);

module.exports = router;

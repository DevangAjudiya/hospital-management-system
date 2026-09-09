/**
 * D3 Consent Enforcement Middleware
 *
 * Server-side source of truth for A/B/C processing consent.
 * Replaces the previous version that incorrectly trusted req.body.patientId.
 *
 * Checks (in order):
 *  1. Authenticated user (JWT)
 *  2. Patient resolved SERVER-SIDE from req.user — never from browser body
 *  3. Consent record exists in DB
 *  4. Consent belongs to the resolved patient
 *  5. Consent status === 'GRANTED'
 *  6. Consent is not expired (expiresAt > now)
 *  7. Consent is not revoked (covered by status check)
 *  8. Requested purpose / dataType is permitted
 *
 * Usage:
 *   router.post('/generate',
 *     authenticate,
 *     requireConsent({ purpose: 'kiosk-consultation', dataTypes: ['All'] }),
 *     handler
 *   )
 *
 * The middleware attaches:
 *   req.resolvedPatientId  — DB-resolved Patient ObjectId (TRUST THIS, not body)
 *   req.verifiedConsent    — the active Consent document
 */

const Consent = require('../models/Consent');
const Patient = require('../models/Patient');
const auditService = require('../services/audit/auditService');

/**
 * Resolves the Patient._id for the authenticated user server-side.
 * Only supports patient role — kiosk tokens are anonymous and must not
 * be able to trigger protected A/B/C clinical processing.
 *
 * @param {object} req - Express request (req.user must be set by authenticate)
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
async function resolvePatientId(req) {
    if (req.user.role === 'patient') {
        const patient = await Patient.findOne({ userId: req.user.id });
        if (!patient) return null;
        return patient._id;
    }
    // kiosk, doctor, admin, etc. — not permitted to call patient-scoped A/B/C
    return null;
}

/**
 * Factory: returns Express middleware that enforces consent for the given
 * purpose and data types.
 *
 * @param {object} opts
 * @param {string}   opts.purpose   - The consent purpose to match
 * @param {string[]} opts.dataTypes - Data types required (e.g. ['All'])
 */
function requireConsent({ purpose, dataTypes = ['All'] } = {}) {
    return async (req, res, next) => {
        // ── 1. Authentication (defensive — should already be enforced upstream) ──
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            // ── 2. Resolve patient server-side (never trust browser-supplied ID) ──
            const patientId = await resolvePatientId(req);
            if (!patientId) {
                await auditService.log({
                    userId: req.user.id,
                    action: 'CONSENT_DENIED',
                    category: 'CONSENT',
                    details: `Protected route blocked — patient identity could not be resolved server-side for role: ${req.user.role}`,
                    resourceType: 'Consent',
                    success: false,
                    purpose,
                    ipAddress: req.ip
                });
                return res.status(403).json({
                    message: 'Patient identity could not be resolved. Please log in as a patient to use kiosk clinical services.',
                    code: 'PATIENT_IDENTITY_UNRESOLVED'
                });
            }

            // Attach for downstream handlers — they MUST use this, not req.body.patientId
            req.resolvedPatientId = patientId;

            // ── 3–7. Consent existence, ownership, status, expiry ────────────────
            const consent = await Consent.findOne({
                patientId,       // ownership enforced here — no cross-patient access
                purpose,
                status: 'GRANTED',
                expiresAt: { $gt: new Date() }  // covers expiry and revocation (REVOKED != GRANTED)
            }).sort({ createdAt: -1 });

            if (!consent) {
                await auditService.log({
                    userId: req.user.id,
                    patientId,
                    action: 'CONSENT_DENIED',
                    category: 'CONSENT',
                    details: `No active GRANTED consent for purpose: ${purpose}`,
                    resourceType: 'Consent',
                    success: false,
                    purpose,
                    ipAddress: req.ip
                });
                return res.status(403).json({
                    message: 'No valid consent found. Please grant consent at the kiosk before clinical processing.',
                    code: 'CONSENT_REQUIRED'
                });
            }

            // ── 8. Data type coverage ─────────────────────────────────────────────
            let covered = consent.requestedDataTypes.includes('All');
            if (!covered) {
                covered = dataTypes.every(dt => consent.requestedDataTypes.includes(dt));
            }

            if (!covered) {
                await auditService.log({
                    userId: req.user.id,
                    patientId,
                    action: 'CONSENT_DENIED',
                    category: 'CONSENT',
                    details: `Consent does not cover required data types: ${dataTypes.join(', ')}`,
                    resourceType: 'Consent',
                    consentId: consent._id,
                    success: false,
                    purpose,
                    ipAddress: req.ip
                });
                return res.status(403).json({
                    message: 'Your consent does not cover the required data types for this operation.',
                    code: 'CONSENT_INSUFFICIENT'
                });
            }

            // All checks passed — attach verified consent for downstream use
            req.verifiedConsent = consent;
            next();
        } catch (err) {
            console.error('[ConsentMiddleware] Unexpected error:', err.message);
            return res.status(500).json({ message: 'Internal error during consent validation' });
        }
    };
}

module.exports = { requireConsent };

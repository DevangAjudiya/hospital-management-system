const express = require('express');
const abdmRouter = express.Router();
const abhaService = require('../services/abdm/abhaAssociationService');
const Consultation = require('../models/Consultation');
const auditService = require('../services/audit/auditService');

// Middleware to restrict access to ABDM callbacks
const abdmCallbackAuth = (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    const allowedIpsStr = process.env.ABDM_CALLBACK_ALLOWED_IPS;
    
    if (allowedIpsStr) {
        const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim());
        const isAllowed = allowedIps.some(allowed => {
            if (allowed === "*") return true; // Explicitly allowed all (NOT recommended for prod)
            // Allow basic wildcard subnets, e.g. "172.18.*"
            if (allowed.endsWith(".*")) {
                const prefix = allowed.slice(0, -2);
                return clientIp.startsWith(prefix) || clientIp.startsWith(`::ffff:${prefix}`);
            }
            return clientIp === allowed || clientIp === `::ffff:${allowed}`;
        });

        if (!isAllowed) {
            console.error(`[ABDM Security] Rejected untrusted callback from IP: ${clientIp}`);
            return res.status(403).json({ error: "Forbidden: Untrusted callback source" });
        }
    } else {
        // Default safe behavior: allow loopback only
        if (clientIp !== "127.0.0.1" && clientIp !== "::1" && clientIp !== "::ffff:127.0.0.1") {
            console.error(`[ABDM Security] Rejected untrusted callback from IP: ${clientIp}. Configure ABDM_CALLBACK_ALLOWED_IPS.`);
            return res.status(403).json({ error: "Forbidden: Untrusted callback source. Configure ABDM_CALLBACK_ALLOWED_IPS." });
        }
    }
    
    next();
};

abdmRouter.use(abdmCallbackAuth);

// POST /v1/patient-discover
abdmRouter.post('/patient-discover', async (req, res) => {
    try {
        const { hipId, patient } = req.body;
        const abhaAddress = patient?.id;

        if (!abhaAddress) {
            return res.status(400).json({ error: "Missing patient ID" });
        }

        const foundPatient = await abhaService.findPatientByAbhaAddress(abhaAddress);

        if (!foundPatient) {
            // Documented Wrapper behavior: 404 for patient not found.
            return res.status(404).json({ error: "Patient not found" });
        }

        // Gather care contexts from Consultations
        const consultations = await Consultation.find({ patientId: foundPatient._id }).populate('doctorId');
        const careContexts = consultations.map(c => ({
            referenceNumber: c._id.toString(),
            display: `Consultation on ${c.createdAt?.toISOString().split('T')[0] || 'Unknown Date'}`
        }));

        await auditService.log({
            userId: null,
            patientId: foundPatient._id,
            action: "ABDM_DISCOVERY_REQUEST",
            category: "ABDM",
            details: "Patient discovery executed",
            resourceType: "Patient",
            resourceId: foundPatient._id.toString(),
            success: true,
            ipAddress: req.ip || req.socket.remoteAddress
        });

        res.json({
            abhaAddress: abhaAddress,
            name: "MediKiosk Patient", // Future: retrieve from User model if populated
            gender: foundPatient.gender === 'male' ? 'M' : (foundPatient.gender === 'female' ? 'F' : 'U'),
            dateOfBirth: foundPatient.dateOfBirth ? foundPatient.dateOfBirth.toISOString().split('T')[0] : "1900-01-01",
            patientReference: foundPatient._id.toString(),
            careContexts
        });
    } catch (err) {
        console.error("ABDM Discovery Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /v1/patient-care-contexts
abdmRouter.post('/patient-care-contexts', async (req, res) => {
    try {
        const { abhaAddress, hipId } = req.body;

        if (!abhaAddress) {
            return res.status(400).json({ error: "Missing abhaAddress" });
        }

        const foundPatient = await abhaService.findPatientByAbhaAddress(abhaAddress);

        if (!foundPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        const consultations = await Consultation.find({ patientId: foundPatient._id }).populate('doctorId');
        const careContexts = consultations.map(c => ({
            referenceNumber: c._id.toString(),
            display: `Consultation on ${c.createdAt?.toISOString().split('T')[0] || 'Unknown Date'}`
        }));

        await auditService.log({
            userId: null,
            patientId: foundPatient._id,
            action: "ABDM_CARE_CONTEXT_FETCH",
            category: "ABDM",
            details: "Care contexts fetched",
            resourceType: "Patient",
            resourceId: foundPatient._id.toString(),
            success: true,
            ipAddress: req.ip || req.socket.remoteAddress
        });

        res.json({
            abhaAddress: abhaAddress,
            patientReference: foundPatient._id.toString(),
            patientDisplay: "MediKiosk Patient",
            careContexts
        });

    } catch (err) {
        console.error("ABDM Care Contexts Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// HIP: POST /v1/health-information (Wrapper fetching data from MediKiosk HIP)
abdmRouter.post('/health-information', async (req, res) => {
    try {
        const { careContexts, patientReference, consentId } = req.body;
        
        if (!patientReference || !careContexts || !careContexts.length) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const Patient = require('../models/Patient');
        const Prescription = require('../models/Prescription');
        const LabReport = require('../models/LabReport');
        const { buildDocumentBundle } = require('../services/fhir/bundleBuilder');

        // Resolve patient safely
        const patient = await Patient.findById(patientReference).populate('userId');
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        // Resolve care contexts (consultations)
        const consultationIds = careContexts.map(c => c.referenceNumber);
        const consultations = await Consultation.find({ _id: { $in: consultationIds }, patientId: patient._id }).populate('doctorId');
        
        if (consultations.length === 0) {
            return res.status(403).json({ error: "No matching care contexts found for this patient" });
        }

        const prescriptions = await Prescription.find({ consultationId: { $in: consultationIds }, patientId: patient._id }).populate('medicines.medicineId');
        const labReports = await LabReport.find({ patientId: patient._id }); // In a real app, tie this to encounter. For now, fetch all or latest.

        const bundle = buildDocumentBundle({ patient, consultations, prescriptions, labReports });

        await auditService.log({
            userId: null,
            patientId: patient._id,
            action: "ABDM_HEALTH_INFO_PUSH",
            category: "ABDM",
            details: `Generated FHIR bundle for consent ${consentId}`,
            resourceType: "Patient",
            resourceId: patient._id.toString(),
            success: true,
            ipAddress: req.ip || req.socket.remoteAddress
        });

        // The exact structure expected by the V1 Wrapper
        res.json({
            bundle
        });

    } catch (err) {
        console.error("ABDM Health Information Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

const notifyRouter = express.Router();
notifyRouter.use(abdmCallbackAuth);

// HIU: POST /v0.5/consents/hiu/notify (Wrapper notifying MediKiosk HIU about consent status)
notifyRouter.post('/consents/hiu/notify', async (req, res) => {
    try {
        const { notification } = req.body;
        if (!notification || !notification.consentRequestId || !notification.status) {
            return res.status(400).json({ error: "Invalid notification payload" });
        }

        const Consent = require('../models/Consent');
        // Find the local consent by the pending request ID (often tracked or just fallback to finding by status/patient)
        // Since we didn't store requestId directly in the model in Phase 1, we will update the latest PENDING consent for the patient
        // For local mock: If status is GRANTED, store the artefact ID
        if (notification.status === 'GRANTED' && notification.consentArtefacts && notification.consentArtefacts.length > 0) {
            const artefactId = notification.consentArtefacts[0].id;
            // Hacky but safe for mock MVP: update the most recent consent missing an abdmConsentId
            const latestConsent = await Consent.findOneAndUpdate(
                { abdmConsentId: null, status: 'GRANTED' }, // Assuming local was granted or pending
                { abdmConsentId: artefactId },
                { new: true, sort: { createdAt: -1 } }
            );

            if (latestConsent) {
                await auditService.log({
                    userId: null,
                    patientId: latestConsent.patientId,
                    action: "ABDM_CONSENT_ARTEFACT_RECEIVED",
                    category: "ABDM",
                    details: `Artefact ${artefactId} stored`,
                    resourceType: "Consent",
                    resourceId: latestConsent._id.toString(),
                    success: true,
                    ipAddress: req.ip || req.socket.remoteAddress
                });
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Consent Notify Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// HIU: POST /v1/transfer/ (Wrapper transferring health info to MediKiosk HIU)
abdmRouter.post('/transfer', async (req, res) => {
    try {
        const { data, careContextReference } = req.body;
        
        if (!data || data.resourceType !== 'Bundle') {
            return res.status(400).json({ error: "Invalid or missing FHIR Bundle data" });
        }

        const { ingestBundle } = require('../services/fhir/abdmBundleIngest');
        const Consultation = require('../models/Consultation');
        
        // Resolve patient from care context if possible, or expect it in query/metadata
        const consultation = await Consultation.findById(careContextReference);
        if (!consultation) {
            return res.status(404).json({ error: "Care context not found" });
        }

        const summary = await ingestBundle(data, consultation.patientId);

        await auditService.log({
            userId: null,
            patientId: consultation.patientId,
            action: "ABDM_HEALTH_INFO_RECEIVED",
            category: "ABDM",
            details: `Imported FHIR Bundle: Processed ${summary.processed.length}, Skipped ${summary.skipped.length}, Errors ${summary.errors.length}`,
            resourceType: "Patient",
            resourceId: consultation.patientId.toString(),
            success: true,
            ipAddress: req.ip || req.socket.remoteAddress
        });

        res.json({ success: true, summary });

    } catch (err) {
        console.error("ABDM Transfer Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = { abdmRouter, notifyRouter };

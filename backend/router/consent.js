const express = require("express");
const consentRouter = express.Router();
const consentService = require("../services/consent/consentService");
const auditService = require("../services/audit/auditService");
const { authenticate } = require("../middleware/authMiddleware");

// POST /api/consent — create (grant) internal consent
// D3: CONSENT_VIEWED is logged on the GET /api/consent/check-status route.
//     CONSENT_GRANTED is logged inside consentService.createConsent.
consentRouter.post("/", authenticate, async (req, res) => {
  try {
    const { patientId, purpose, requestedDataTypes, expiresAt, audioConsentProvided } = req.body;
    
    if (!patientId || !purpose || !expiresAt) {
      return res.status(400).json({ message: "patientId, purpose, and expiresAt are required" });
    }

    const consent = await consentService.createConsent({
      patientId,
      purpose,
      requestedDataTypes: requestedDataTypes || ["All"],
      expiresAt,
      audioConsentProvided,
      createdBy: req.user.id,
      ipAddress: req.ip
    });

    res.status(201).json({ message: "Consent granted successfully", consent });
  } catch (error) {
    console.error("Create Consent Error:", error);
    res.status(500).json({ message: "Failed to create consent" });
  }
});

// POST /api/consent/viewed — logs that patient viewed the consent screen
// Called by the frontend KioskConsentPage when the consent UI is rendered.
// Does NOT create or modify a consent record.
consentRouter.post("/viewed", authenticate, async (req, res) => {
  try {
    const { patientId } = req.body;
    await auditService.log({
      userId: req.user.id,
      patientId: patientId || null,
      action: "CONSENT_VIEWED",
      category: "CONSENT",
      details: "Patient viewed the consent information screen",
      resourceType: "Consent",
      success: true,
      ipAddress: req.ip
    });
    res.status(200).json({ message: "Consent view recorded" });
  } catch (error) {
    console.error("Consent Viewed Log Error:", error);
    res.status(500).json({ message: "Failed to record consent view" });
  }
});

// POST /api/consent/decline — logs that patient explicitly declined consent
// Does NOT create a Consent document; declines are audit-only for traceability.
consentRouter.post("/decline", authenticate, async (req, res) => {
  try {
    const { patientId, purpose } = req.body;
    await auditService.log({
      userId: req.user.id,
      patientId: patientId || null,
      action: "CONSENT_REJECTED",
      category: "CONSENT",
      details: `Patient explicitly declined consent for purpose: ${purpose || "kiosk-consultation"}`,
      resourceType: "Consent",
      success: true,
      purpose: purpose || "kiosk-consultation",
      ipAddress: req.ip
    });
    res.status(200).json({ message: "Consent decline recorded" });
  } catch (error) {
    console.error("Consent Decline Log Error:", error);
    res.status(500).json({ message: "Failed to record consent decline" });
  }
});

// GET /api/consent/:patientId
consentRouter.get("/:patientId", authenticate, async (req, res) => {

  try {
    const Consent = require("../models/Consent");
    const consents = await Consent.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json(consents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch consents" });
  }
});

// PUT /api/consent/:id/revoke
consentRouter.put("/:id/revoke", authenticate, async (req, res) => {
  try {
    const consent = await consentService.revokeConsent({
      consentId: req.params.id,
      revokedBy: req.user.id,
      ipAddress: req.ip
    });
    res.json({ message: "Consent revoked successfully", consent });
  } catch (error) {
    if (error.message === "Consent not found" || error.message === "Consent is already revoked") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Revoke Consent Error:", error);
    res.status(500).json({ message: "Failed to revoke consent" });
  }
});

// POST /api/consent/:id/abdm-init
consentRouter.post("/:id/abdm-init", authenticate, async (req, res) => {
  try {
    const Consent = require("../models/Consent");
    const Patient = require("../models/Patient");
    const abdmWrapperClient = require("../services/abdm/abdmWrapperClient");

    const consent = await Consent.findById(req.params.id);
    if (!consent) return res.status(404).json({ message: "Consent not found" });

    // Enforce patient ownership for safety if requester is a patient
    if (req.user.role === "patient" && req.user.id !== consent.createdBy.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const patient = await Patient.findById(consent.patientId);
    if (!patient || !patient.abhaAddress) {
      return res.status(400).json({ message: "Patient lacks an associated ABHA address" });
    }

    const careContexts = req.body.careContexts;
    if (!careContexts || !careContexts.length) {
      return res.status(400).json({ message: "careContexts required to init ABDM consent" });
    }

    const result = await abdmWrapperClient.initiateConsent({
      abhaAddress: patient.abhaAddress,
      careContexts,
      purpose: { text: consent.purpose, code: "CAREMGT", refUri: "wrapper" }
    });

    if (!result.success) {
      return res.status(500).json({ message: "Failed to init ABDM consent", error: result.error });
    }

    res.json({ message: "ABDM Consent initiated", requestId: result.requestId });
  } catch (error) {
    console.error("ABDM Consent Init Error:", error);
    res.status(500).json({ message: "Failed to initiate ABDM consent" });
  }
});

// POST /api/consent/:id/abdm-fetch
consentRouter.post("/:id/abdm-fetch", authenticate, async (req, res) => {
  try {
    const Consent = require("../models/Consent");
    const abdmWrapperClient = require("../services/abdm/abdmWrapperClient");

    const consent = await Consent.findById(req.params.id);
    if (!consent) return res.status(404).json({ message: "Consent not found" });

    if (consent.status !== 'GRANTED') {
      return res.status(403).json({ message: "Consent is not GRANTED" });
    }
    if (!consent.abdmConsentId) {
      return res.status(400).json({ message: "No ABDM artefact associated with this consent" });
    }

    const result = await abdmWrapperClient.requestHealthInformation(consent.abdmConsentId);
    
    if (!result.success) {
      return res.status(500).json({ message: "Failed to fetch ABDM records", error: result.error });
    }

    res.json({ message: "Health information fetch requested", requestId: result.requestId });
  } catch (error) {
    console.error("ABDM Fetch Error:", error);
    res.status(500).json({ message: "Failed to request health info" });
  }
});

module.exports = consentRouter;

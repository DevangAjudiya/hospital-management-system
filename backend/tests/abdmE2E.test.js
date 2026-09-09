const assert = require('assert');
const mongoose = require('mongoose');
const origModel = mongoose.model;
mongoose.model = function(name, schema) {
    if (mongoose.models[name]) return mongoose.models[name];
    return origModel.apply(this, arguments);
};
const crypto = require('crypto');

process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
process.env.ABDM_CALLBACK_ALLOWED_IPS = "*"; // Allow all for tests

const Patient = require('../models/Patient');
const Consent = require('../models/Consent');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const abhaService = require('../services/abdm/abhaAssociationService');
const authRouter = require('../router/auth');
const consentRouter = require('../router/consent');
const { abdmRouter, notifyRouter } = require('../router/abdm');
const abdmWrapperClient = require('../services/abdm/abdmWrapperClient');

function mockRequest(body, user, ip = "127.0.0.1", params = {}) {
    return { body, user, ip, params, socket: { remoteAddress: ip } };
}

function mockResponse() {
    const res = {};
    res.status = function(code) { this.statusCode = code; return this; };
    res.json = function(data) { this.body = data; return this; };
    return res;
}

let mockDbPatients = [];
let mockDbConsents = [];
let mockDbConsultations = [];

Patient.findById = function(id) {
    const res = mockDbPatients.find(p => p._id.toString() === id.toString());
    const query = { populate: () => res };
    return Object.assign(Promise.resolve(res), query);
};
Patient.findOne = async (q) => mockDbPatients.find(p => p.abhaAddressHash === q.abhaAddressHash);
Patient.prototype.save = async function() { mockDbPatients.push(this); return this; };

Consent.findById = async (id) => mockDbConsents.find(c => c._id.toString() === id.toString());
Consent.findOneAndUpdate = async (q, upd) => {
    let c = mockDbConsents.find(c => c.abdmConsentId === q.abdmConsentId && c.status === q.status);
    if (c) c.abdmConsentId = upd.abdmConsentId;
    return c;
};
Consent.prototype.save = async function() { mockDbConsents.push(this); return this; };

Consultation.findById = async (id) => mockDbConsultations.find(c => c._id.toString() === id.toString());
Consultation.find = function(q) {
    const res = mockDbConsultations.filter(c => c.patientId.toString() === q.patientId.toString() || (q._id && q._id.$in.includes(c._id.toString())));
    const query = { populate: () => res };
    return Object.assign(Promise.resolve(res), query);
};
Consultation.prototype.save = async function() { mockDbConsultations.push(this); return this; };

const origFind = Consultation.find;
const Prescription = require('../models/Prescription');
Prescription.find = function() {
    const res = [];
    const query = { populate: () => res };
    return Object.assign(Promise.resolve(res), query);
};

const LabReport = require('../models/LabReport');
LabReport.find = async () => [];

const AuditLog = require('../models/AuditLog');
AuditLog.prototype.save = async function() { return this; };
AuditLog.insertMany = async function() { return []; };

async function runE2E() {
    console.log("Running E2E Mock Flow...\n");
    let passed = 0;
    let failed = 0;
    
    // Setup Mock Data
    const doctorUser = new User({ _id: new mongoose.Types.ObjectId(), name: "Dr. Mock", email: "doc@test.com", password: "pwd", role: "doctor" });
    const patientUser = new User({ _id: new mongoose.Types.ObjectId(), name: "Test Patient", email: "pat@test.com", password: "pwd", role: "patient" });
    
    const p1 = new Patient({ _id: new mongoose.Types.ObjectId(), userId: patientUser._id, gender: "male", phoneNumber: "9999999999" });
    await p1.save();

    const c1 = new Consultation({ _id: new mongoose.Types.ObjectId(), patientId: p1._id, doctorId: doctorUser._id, diagnosis: "Test" });
    await c1.save();
    
    // 1. Associate ABHA
    const abha = "mock-abha@abdm";
    await abhaService.storeAbhaAddress(p1._id, abha, p1.userId, "127.0.0.1");

    // 2. Create Consent
    const consent = new Consent({
        patientId: p1._id,
        purpose: "Care provisioning",
        requestedDataTypes: ["Observation"],
        status: "GRANTED",
        expiresAt: new Date(Date.now() + 100000),
        createdBy: p1.userId
    });
    await consent.save();

    // Mock Wrapper Client
    abdmWrapperClient.initiateConsent = async () => ({ success: true, requestId: "req-123" });
    abdmWrapperClient.requestHealthInformation = async () => ({ success: true, requestId: "req-456" });

    // 3. Init ABDM Consent
    try {
        const initReq = mockRequest({ careContexts: [{ referenceNumber: c1._id.toString() }] }, { id: p1.userId.toString(), role: "patient" }, "127.0.0.1", { id: consent._id.toString() });
        const initRes = mockResponse();
        // find handler bypassing authMiddleware
        const initRoute = consentRouter.stack.find(r => r.route?.path === '/:id/abdm-init').route;
        const initHandler = initRoute.stack[initRoute.stack.length - 1].handle;
        
        await initHandler(initReq, initRes);
        assert.strictEqual(initRes.statusCode, undefined); // 200 by default in mock if not set
        assert.strictEqual(initRes.body.message, "ABDM Consent initiated");
        console.log("✅ E2E Phase 3: ABDM Consent Initiated");
        passed++;
    } catch(e) { console.error("❌ Phase 3 Failed", e); failed++; }

    // 4. Wrapper Consent Notify
    try {
        const notifyReq = mockRequest({
            notification: { consentRequestId: "req-123", status: "GRANTED", consentArtefacts: [{ id: "artefact-123" }] }
        }, null);
        const notifyRes = mockResponse();
        const notifyRoute = notifyRouter.stack.find(r => r.route?.path === '/consents/hiu/notify').route;
        const notifyHandler = notifyRoute.stack[notifyRoute.stack.length - 1].handle;
        
        await notifyHandler(notifyReq, notifyRes);
        const updatedConsent = await Consent.findById(consent._id);
        assert.strictEqual(updatedConsent.abdmConsentId, "artefact-123");
        console.log("✅ E2E Phase 4 & 5 & 6: Consent Notify Received and Artefact stored");
        passed++;
    } catch(e) { console.error("❌ Phase 4 Failed", e); failed++; }

    // 5. Request Health Info
    try {
        const fetchReq = mockRequest({}, { id: p1.userId.toString(), role: "patient" }, "127.0.0.1", { id: consent._id.toString() });
        const fetchRes = mockResponse();
        const fetchRoute = consentRouter.stack.find(r => r.route?.path === '/:id/abdm-fetch').route;
        const fetchHandler = fetchRoute.stack[fetchRoute.stack.length - 1].handle;
        
        await fetchHandler(fetchReq, fetchRes);
        assert.strictEqual(fetchRes.body.message, "Health information fetch requested");
        console.log("✅ E2E Phase 7: Health info requested");
        passed++;
    } catch(e) { console.error("❌ Phase 7 Failed", e); failed++; }

    // 6. HIP Health Info Push
    let generatedBundle = null;
    try {
        const hiPushReq = mockRequest({
            patientReference: p1._id.toString(),
            careContexts: [{ referenceNumber: c1._id.toString() }],
            consentId: "artefact-123"
        });
        const hiPushRes = mockResponse();
        const hiPushRoute = abdmRouter.stack.find(r => r.route?.path === '/health-information').route;
        const hiPushHandler = hiPushRoute.stack[hiPushRoute.stack.length - 1].handle;
        
        await hiPushHandler(hiPushReq, hiPushRes);
        generatedBundle = hiPushRes.body.bundle;
        assert.strictEqual(generatedBundle.resourceType, "Bundle");
        console.log("✅ E2E Phase 8 & 9 & 10: HIP Health Info fetched and Bundle generated");
        passed++;
    } catch(e) { console.error("❌ Phase 8 Failed", e); failed++; }

    // 7. HIU Transfer Inbound
    try {
        const transferReq = mockRequest({
            careContextReference: c1._id.toString(),
            data: generatedBundle
        });
        const transferRes = mockResponse();
        const transferHandler = abdmRouter.stack.find(r => r.route?.path === '/transfer').route.stack.find(s => s.handle).handle;
        
        await transferHandler(transferReq, transferRes);
        assert.strictEqual(transferRes.body.success, true);
        assert.ok(transferRes.body.summary.processed.length > 0);
        console.log("✅ E2E Phase 11 & 12 & 13: Inbound Transfer processed successfully");
        passed++;
    } catch(e) { console.error("❌ Phase 11 Failed", e); failed++; }

    console.log(`\nE2E Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runE2E();

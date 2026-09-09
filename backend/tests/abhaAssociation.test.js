const assert = require("assert");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Set env vars
process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
process.env.AUDIT_RETENTION_DAYS = "90";

const abhaService = require('../services/abdm/abhaAssociationService');
const Patient = require("../models/Patient");
const Consultation = require("../models/Consultation");
const auditService = require("../services/audit/auditService");
const { abdmRouter } = require("../router/abdm");
const patientRouter = require("../router/patient");

let auditLogs = [];
auditService.log = async (logData) => {
    auditLogs.push(logData);
};

// Mock Patient DB logic for the service
let mockDbPatients = [];
let mockDbConsultations = [];

Patient.findById = async (id) => mockDbPatients.find(p => p._id.toString() === id.toString());
Patient.findOne = async (query) => {
    if (query.userId) return mockDbPatients.find(p => p.userId === query.userId);
    if (query.abhaAddressHash) return mockDbPatients.find(p => p.abhaAddressHash === query.abhaAddressHash);
    return null;
};
Patient.prototype.save = async function() {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    const existing = mockDbPatients.findIndex(p => p._id.toString() === this._id.toString());
    if (existing >= 0) mockDbPatients[existing] = this;
    else mockDbPatients.push(this);
    return this;
};

Consultation.find = ({ patientId }) => {
    return {
        populate: async () => mockDbConsultations.filter(c => c.patientId.toString() === patientId.toString())
    };
};

// Simple Express Request Mock
const mockRequest = (body, user) => ({ body, user, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } });
const mockResponse = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

// Find handlers
const patientAssociateHandler = patientRouter.stack.find(r => r.route && r.route.path === '/associate-abha' && r.route.methods.post).route.stack[0].handle;
const patientDiscoverHandler = abdmRouter.stack.find(r => r.route && r.route.path === '/patient-discover' && r.route.methods.post).route.stack[0].handle;
const patientCareContextsHandler = abdmRouter.stack.find(r => r.route && r.route.path === '/patient-care-contexts' && r.route.methods.post).route.stack[0].handle;

async function runTests() {
    console.log("Running ABHA Association & ABDM Callback Tests...\n");
    let passed = 0;
    let failed = 0;

    // A. ABHA normalization
    try {
        const norm1 = abhaService.normalizeAbhaAddress(" Patient@ABDM ");
        const norm2 = abhaService.normalizeAbhaAddress("patient@abdm");
        assert.strictEqual(norm1, "patient@abdm");
        assert.strictEqual(norm2, "patient@abdm");
        console.log("✅ Test A: ABHA normalization works correctly");
        passed++;
    } catch (e) { console.error("❌ Test A Failed", e); failed++; }

    // B & C. ABHA encryption + hash storage, patient lookup via hash
    try {
        const patient = new Patient({ userId: "user-123" });
        await patient.save();

        const associatedPatient = await abhaService.storeAbhaAddress(patient._id, "Test@ABDM", "user-123", "127.0.0.1");
        
        assert.ok(associatedPatient.abhaAddress.startsWith("v1:"));
        assert.ok(associatedPatient.abhaAddressHash.length > 0);
        assert.notStrictEqual(associatedPatient.abhaAddress, "test@abdm");

        const found = await abhaService.findPatientByAbhaAddress(" test@abdm ");
        assert.ok(found);
        assert.strictEqual(found._id.toString(), patient._id.toString());

        console.log("✅ Test B & C: ABHA encryption + hash storage and hash lookup work");
        passed++;
    } catch (e) { console.error("❌ Test B & C Failed", e); failed++; }

    // D & E. Patient Association API
    try {
        const p2 = new Patient({ userId: "mock-user-1" });
        await p2.save();

        // Admin needs patientId
        const reqAdmin = mockRequest({ abhaAddress: "admin-target@abdm" }, { id: "admin-1", role: "admin" });
        const resAdmin = mockResponse();
        await patientAssociateHandler(reqAdmin, resAdmin);
        assert.strictEqual(resAdmin.statusCode, 400);

        // Patient succeeds
        const reqPatient = mockRequest({ abhaAddress: "patient1@abdm" }, { id: "mock-user-1", role: "patient" });
        const resPatient = mockResponse();
        await patientAssociateHandler(reqPatient, resPatient);
        assert.strictEqual(resPatient.statusCode, undefined); // 200 by default in Express if not set, or we can check body
        assert.strictEqual(resPatient.body.message, "ABHA Address associated successfully");
        
        const foundP2 = await abhaService.findPatientByAbhaAddress("patient1@abdm");
        assert.ok(foundP2);
        assert.strictEqual(foundP2.abhaAddressHash, abhaService.hashAbhaAddress("patient1@abdm"));

        console.log("✅ Test D & E: Patient Association API requires auth and works correctly");
        passed++;
    } catch (e) { console.error("❌ Test D & E Failed", e); failed++; }

    // F, G, I. /v1/patient-discover
    try {
        // Unknown ABHA
        const reqUnknown = mockRequest({ hipId: "hip-1", patient: { id: "unknown@abdm" } });
        const resUnknown = mockResponse();
        await patientDiscoverHandler(reqUnknown, resUnknown);
        assert.strictEqual(resUnknown.statusCode, 404);

        // Correct patient
        mockDbConsultations.push({
            _id: new mongoose.Types.ObjectId(),
            patientId: mockDbPatients[0]._id, // "test@abdm"
            createdAt: new Date("2026-01-01T10:00:00Z"),
            doctorId: { name: "Dr. Mock" }
        });

        const reqDiscover = mockRequest({ hipId: "hip-1", patient: { id: "test@abdm" } });
        const resDiscover = mockResponse();
        await patientDiscoverHandler(reqDiscover, resDiscover);
        
        assert.strictEqual(resDiscover.body.abhaAddress, "test@abdm");
        assert.strictEqual(resDiscover.body.patientReference, mockDbPatients[0]._id.toString());
        assert.strictEqual(resDiscover.body.careContexts.length, 1);
        
        // Ensure no mongo internals leak (like raw _id in root, _v)
        assert.ok(!resDiscover.body._id);
        assert.ok(!resDiscover.body.__v);

        console.log("✅ Test F, G, I: /v1/patient-discover works, handles unknown, and hides mongo internals");
        passed++;
    } catch (e) { console.error("❌ Test F, G, I Failed", e); failed++; }

    // H. /v1/patient-care-contexts
    try {
        const reqCtx = mockRequest({ abhaAddress: "test@abdm", hipId: "hip-1" });
        const resCtx = mockResponse();
        await patientCareContextsHandler(reqCtx, resCtx);
        
        assert.strictEqual(resCtx.body.careContexts.length, 1);
        assert.strictEqual(resCtx.body.patientReference, mockDbPatients[0]._id.toString());

        console.log("✅ Test H: /v1/patient-care-contexts works and returns correct contexts");
        passed++;
    } catch (e) { console.error("❌ Test H Failed", e); failed++; }

    // J. Plaintext ABHA never appears in logs
    try {
        let plaintextLeaked = false;
        const loggedText = JSON.stringify(auditLogs);
        if (loggedText.includes("test@abdm") || loggedText.includes("patient1@abdm")) {
            plaintextLeaked = true;
        }
        assert.strictEqual(plaintextLeaked, false);
        
        console.log("✅ Test J: Plaintext ABHA is never leaked into audit logs");
        passed++;
    } catch (e) { console.error("❌ Test J Failed", e); failed++; }

    // K. Duplicate ABHA Hash (Conflict handling)
    try {
        const p3 = new Patient({ userId: "mock-user-3" });
        await p3.save();

        // Simulate 11000 duplicate key error from Mongoose
        const originalSave = Patient.prototype.save;
        Patient.prototype.save = async function() {
            if (this.abhaAddressHash === abhaService.hashAbhaAddress("patient1@abdm")) {
                const err = new Error("Duplicate key");
                err.code = 11000;
                throw err;
            }
            return originalSave.call(this);
        };

        const reqConflict = mockRequest({ abhaAddress: "patient1@abdm", patientId: p3._id.toString() }, { id: "admin-1", role: "admin" });
        const resConflict = mockResponse();
        await patientAssociateHandler(reqConflict, resConflict);
        
        assert.strictEqual(resConflict.statusCode, 409);
        assert.strictEqual(resConflict.body.message, "This ABHA Address is already associated with an existing patient profile");
        
        // Restore
        Patient.prototype.save = originalSave;
        
        console.log("✅ Test K: Duplicate ABHA hash association safely returns 409 Conflict");
        passed++;
    } catch (e) { console.error("❌ Test K Failed", e); failed++; }

    // L. Malformed patientId
    try {
        const reqMalformed = mockRequest({ abhaAddress: "patient4@abdm", patientId: "invalid-id-string" }, { id: "admin-1", role: "admin" });
        const resMalformed = mockResponse();
        await patientAssociateHandler(reqMalformed, resMalformed);
        
        assert.strictEqual(resMalformed.statusCode, 400);
        assert.strictEqual(resMalformed.body.message, "Malformed patientId");
        
        console.log("✅ Test L: Malformed patientId is cleanly rejected with 400");
        passed++;
    } catch (e) { console.error("❌ Test L Failed", e); failed++; }

    // M. Callback protection
    try {
        const abdmCallbackAuth = abdmRouter.stack.find(r => r.name === 'abdmCallbackAuth').handle;
        
        // Untrusted IP
        const reqUntrusted = mockRequest({}, null);
        reqUntrusted.ip = "192.168.1.100";
        const resUntrusted = mockResponse();
        let nextCalled = false;
        
        await abdmCallbackAuth(reqUntrusted, resUntrusted, () => { nextCalled = true; });
        assert.strictEqual(resUntrusted.statusCode, 403);
        assert.strictEqual(nextCalled, false);
        
        // Trusted IP (localhost)
        const reqTrusted = mockRequest({}, null);
        reqTrusted.ip = "127.0.0.1";
        const resTrusted = mockResponse();
        nextCalled = false;
        
        await abdmCallbackAuth(reqTrusted, resTrusted, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);
        
        console.log("✅ Test M: ABDM callback endpoints are secured by IP restrictions");
        passed++;
    } catch (e) { console.error("❌ Test M Failed", e); failed++; }

    console.log(`\nABHA Association Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();

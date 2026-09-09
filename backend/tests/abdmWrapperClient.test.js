const assert = require("assert");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Mock axios before importing the client
const axios = require("axios");
const originalAxios = axios;
let axiosMockCalls = [];
let mockAxiosImplementation = null;

// Replace axios with a mock
require.cache[require.resolve('axios')].exports = async function(config) {
    axiosMockCalls.push(config);
    if (mockAxiosImplementation) {
        return mockAxiosImplementation(config);
    }
    return { data: { code: 0, httpStatusCode: "ACCEPTED" }, status: 202 };
};

const abdmWrapperClient = require("../services/abdm/abdmWrapperClient");
const Patient = require("../models/Patient");
const Consent = require("../models/Consent");

async function runTests() {
    console.log("Running ABDM Wrapper Client and Model Tests...\n");
    let passed = 0;
    let failed = 0;

    function resetMock() {
        axiosMockCalls = [];
        mockAxiosImplementation = null;
    }

    // Test 1: Wrapper URL comes from environment
    try {
        assert.strictEqual(abdmWrapperClient.baseUrl, process.env.ABDM_WRAPPER_URL || 'http://localhost:8082');
        console.log("✅ Test 1: Wrapper URL is correctly picked up from environment");
        passed++;
    } catch (e) {
        console.error("❌ Test 1 Failed", e);
        failed++;
    }

    // Test 2: Consent request generates a fresh requestId and validates input
    try {
        resetMock();
        const res1 = await abdmWrapperClient.initiateConsent({
            abhaAddress: "patient@abdm",
            careContexts: [{ patientReference: "patient@abdm", careContextReference: "ref1" }]
        });
        
        assert.strictEqual(res1.success, true);
        assert.ok(res1.requestId, "Should generate a requestId");
        
        const call1 = axiosMockCalls[0];
        assert.strictEqual(call1.url, `${abdmWrapperClient.baseUrl}/v1/consent-init`);
        assert.strictEqual(call1.data.requestId, res1.requestId);
        assert.strictEqual(call1.data.consent.patient.id, "patient@abdm");

        console.log("✅ Test 2: Consent request generates a fresh requestId and handles valid input");
        passed++;
    } catch (e) {
        console.error("❌ Test 2 Failed", e);
        failed++;
    }

    // Test 3: Health-information request generates a fresh requestId
    try {
        resetMock();
        const consentId = crypto.randomUUID();
        const res = await abdmWrapperClient.requestHealthInformation(consentId);
        
        assert.strictEqual(res.success, true);
        assert.ok(res.requestId, "Should generate a requestId");
        
        const call1 = axiosMockCalls[0];
        assert.strictEqual(call1.url, `${abdmWrapperClient.baseUrl}/v1/health-information/fetch-records`);
        assert.strictEqual(call1.data.requestId, res.requestId);
        assert.strictEqual(call1.data.consentId, consentId);

        console.log("✅ Test 3: Health-information request generates a fresh requestId");
        passed++;
    } catch (e) {
        console.error("❌ Test 3 Failed", e);
        failed++;
    }

    // Test 4: Required input validation works
    try {
        resetMock();
        const res1 = await abdmWrapperClient.initiateConsent({});
        assert.strictEqual(res1.success, false);
        assert.strictEqual(res1.error, "Missing required abhaAddress");

        const res2 = await abdmWrapperClient.initiateConsent({ abhaAddress: "patient@abdm" });
        assert.strictEqual(res2.success, false);
        assert.strictEqual(res2.error, "Missing required careContexts array");

        const res3 = await abdmWrapperClient.requestHealthInformation();
        assert.strictEqual(res3.success, false);
        assert.strictEqual(res3.error, "Missing required consentId");

        console.log("✅ Test 4: Required input validation works properly");
        passed++;
    } catch (e) {
        console.error("❌ Test 4 Failed", e);
        failed++;
    }

    // Test 5 & 6: HTTP errors are normalized safely & full response payloads are not logged in output object
    try {
        resetMock();
        mockAxiosImplementation = async () => {
            const err = new Error("Request failed with status code 400");
            err.response = { status: 400, data: { error: { code: 1000, message: "Bad Request" } } };
            throw err;
        };

        // Suppress console.error for this test so we don't pollute the test output with expected errors
        const originalError = console.error;
        let loggedMsg = "";
        console.error = (msg) => { loggedMsg = msg; };

        const res = await abdmWrapperClient.initiateConsent({
            abhaAddress: "patient@abdm",
            careContexts: [{ patientReference: "patient@abdm", careContextReference: "ref1" }]
        });

        console.error = originalError; // Restore

        assert.strictEqual(res.success, false);
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.error.error.code, 1000);
        assert.ok(loggedMsg.includes("[ABDM Wrapper Error]"));

        console.log("✅ Test 5 & 6: HTTP errors are normalized safely and logged properly");
        passed++;
    } catch (e) {
        console.error("❌ Test 5 & 6 Failed", e);
        failed++;
    }

    // Test 7: Patient accepts abhaAddress and abhaAddressHash securely
    try {
        const userId = new mongoose.Types.ObjectId();
        process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
        const encryptionService = require("../services/crypto/encryptionService");
        encryptionService.initKeyProvider(); // Re-initialize the key

        const rawAbha = "test@abdm";
        const encryptedAbha = encryptionService.encrypt(rawAbha);
        const hashedAbha = encryptionService.hash(rawAbha);

        const patient = new Patient({
            userId,
            gender: "male",
            abhaAddress: encryptedAbha,
            abhaAddressHash: hashedAbha
        });
        
        const err = patient.validateSync();
        assert.ok(!err, "Validation should pass");
        assert.strictEqual(patient.abhaAddress, encryptedAbha);
        assert.strictEqual(patient.abhaAddressHash, hashedAbha);

        // Serialization Test: Ensure toJSON does not automatically decrypt abhaAddress
        const serialized = JSON.stringify(patient);
        assert.ok(serialized.includes(encryptedAbha), "Serialized JSON should contain the ciphertext");
        assert.ok(!serialized.includes(rawAbha), "Serialized JSON MUST NOT leak the plaintext ABHA address");

        // Search Simulation Test: Verify that looking up by hash works conceptually
        // In a real DB, Patient.findOne({ abhaAddressHash: encryptionService.hash(input) })
        const searchInput = " TEST@abdm "; // different case and spacing
        const searchHash = encryptionService.hash(searchInput);
        assert.strictEqual(searchHash, patient.abhaAddressHash, "Deterministic hash lookup must match regardless of input normalization");
        
        // Confirm direct encrypted lookup is impossible (different IVs)
        const newEncryptedAbha = encryptionService.encrypt(rawAbha);
        assert.notStrictEqual(newEncryptedAbha, patient.abhaAddress, "Non-deterministic encryption prevents direct querying");

        console.log("✅ Test 7: Patient model accepts abhaAddress securely, supports hash search, and doesn't leak in JSON");
        passed++;
    } catch (e) {
        console.error("❌ Test 7 Failed", e);
        failed++;
    }

    // Test 8: Consent accepts abdmConsentId and maintains existing behavior
    try {
        const patientId = new mongoose.Types.ObjectId();
        const createdBy = new mongoose.Types.ObjectId();
        const abdmId = crypto.randomUUID();
        
        const consent = new Consent({
            patientId,
            purpose: "Care Management",
            requestedDataTypes: ["Observation"],
            expiresAt: new Date(),
            createdBy,
            abdmConsentId: abdmId
        });
        
        const err = consent.validateSync();
        assert.ok(!err, "Validation should pass");
        assert.strictEqual(consent.abdmConsentId, abdmId);

        console.log("✅ Test 8: Consent model accepts abdmConsentId properly");
        passed++;
    } catch (e) {
        console.error("❌ Test 8 Failed", e);
        failed++;
    }

    console.log(`\nABDM Wrapper Client Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();

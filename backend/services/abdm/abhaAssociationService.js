const Patient = require('../../models/Patient');
const encryptionService = require('../crypto/encryptionService');
const auditService = require('../audit/auditService');

class AbhaAssociationService {
    normalizeAbhaAddress(abhaAddress) {
        if (!abhaAddress) return null;
        return abhaAddress.trim().toLowerCase();
    }

    encryptAbhaAddress(normalizedAbha) {
        return encryptionService.encrypt(normalizedAbha);
    }

    hashAbhaAddress(normalizedAbha) {
        return encryptionService.hash(normalizedAbha);
    }

    async storeAbhaAddress(patientId, abhaAddress, userId, ipAddress) {
        const normalized = this.normalizeAbhaAddress(abhaAddress);
        if (!normalized) throw new Error("Invalid ABHA Address");

        // Use the existing deterministic hash and non-deterministic encryption rules
        const encrypted = this.encryptAbhaAddress(normalized);
        const hash = this.hashAbhaAddress(normalized);

        const patient = await Patient.findById(patientId);
        if (!patient) throw new Error("Patient not found");

        // Do not automatically overwrite existing ABHA if it differs,
        // though for Phase 2 we assume direct assignment.
        // We ensure we don't expose plaintext in logs or errors.
        patient.abhaAddress = encrypted;
        patient.abhaAddressHash = hash;
        await patient.save();

        // Audit the event safely without exposing plaintext
        await auditService.log({
            userId,
            patientId,
            action: "ABHA_ASSOCIATION",
            category: "IDENTITY",
            details: "Patient associated with ABHA address",
            resourceType: "Patient",
            resourceId: patientId.toString(),
            success: true,
            ipAddress
        });

        return patient;
    }

    async findPatientByAbhaAddress(abhaAddress) {
        const normalized = this.normalizeAbhaAddress(abhaAddress);
        if (!normalized) return null;

        const hash = this.hashAbhaAddress(normalized);
        
        // CRITICAL: We MUST query using the deterministic abhaAddressHash.
        // Directly querying the encrypted abhaAddress will always fail because 
        // encryptionService.encrypt() generates a random IV each time.
        const patient = await Patient.findOne({ abhaAddressHash: hash });
        return patient;
    }
}

module.exports = new AbhaAssociationService();

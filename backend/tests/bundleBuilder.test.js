const assert = require("assert");
const mongoose = require("mongoose");
const { buildDocumentBundle } = require("../services/fhir/bundleBuilder");

function runBundleTests() {
    console.log("Running FHIR Bundle Builder Tests...\n");
    let passed = 0;
    let failed = 0;

    const patientId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const doctorId = new mongoose.Types.ObjectId();
    const consultationId = new mongoose.Types.ObjectId();

    const mockPatient = {
        _id: patientId,
        userId: { _id: userId, name: "Test Patient", email: "test@abdm.com" },
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        phoneNumber: "9999999999"
    };

    const mockConsultation = {
        _id: consultationId,
        patientId: patientId,
        doctorId: { _id: doctorId, name: "Dr. Mock" },
        status: "Completed",
        createdAt: new Date(),
        diagnosis: "Viral Fever",
        notes: "Rest and fluids"
    };

    const mockPrescription = {
        _id: new mongoose.Types.ObjectId(),
        consultationId: consultationId,
        patientId: patientId,
        medicines: [
            {
                medicineId: { name: "Paracetamol", type: "Tablet" },
                dosage: "1-0-1",
                duration: "3 days",
                instructions: "After meals"
            }
        ]
    };

    const mockLabReport = {
        _id: new mongoose.Types.ObjectId(),
        patientId: patientId,
        testType: "CBC",
        result: "Normal",
        date: new Date()
    };

    // Test 1: Valid patient-only Bundle
    try {
        const bundle = buildDocumentBundle({ patient: mockPatient });
        assert.strictEqual(bundle.resourceType, "Bundle");
        assert.strictEqual(bundle.type, "document");
        assert.ok(bundle.meta.profile.includes("https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"));
        assert.strictEqual(bundle.entry.length, 2); // 1 Composition + 1 Patient
        
        const comp = bundle.entry[0].resource;
        assert.strictEqual(comp.resourceType, "Composition");
        assert.strictEqual(comp.subject.reference, `Patient/${patientId.toString()}`);
        
        console.log("✅ Test 1: Valid patient-only Bundle generated successfully");
        passed++;
    } catch(e) { console.error("❌ Test 1 Failed", e); failed++; }

    // Test 2: Complete Bundle with patient + encounter + condition
    try {
        const bundle = buildDocumentBundle({ patient: mockPatient, consultations: [mockConsultation] });
        assert.strictEqual(bundle.entry.length, 4); // Comp, Patient, Encounter, Condition
        
        const comp = bundle.entry[0].resource;
        assert.ok(comp.encounter.reference.includes(consultationId.toString()));
        assert.strictEqual(comp.author[0].display, "Dr. Mock");
        
        console.log("✅ Test 2: Complete Bundle with patient + encounter + condition generated");
        passed++;
    } catch(e) { console.error("❌ Test 2 Failed", e); failed++; }

    // Test 3: Multiple MedicationStatements
    try {
        const bundle = buildDocumentBundle({ patient: mockPatient, prescriptions: [mockPrescription] });
        const meds = bundle.entry.filter(e => e.resource.resourceType === "MedicationStatement");
        assert.strictEqual(meds.length, 1);
        assert.strictEqual(meds[0].resource.medicationCodeableConcept.text, "Paracetamol");
        
        console.log("✅ Test 3: MedicationStatements generated correctly");
        passed++;
    } catch(e) { console.error("❌ Test 3 Failed", e); failed++; }

    // Test 4: Missing optional data / no undefined entries
    try {
        const bundle = buildDocumentBundle({ patient: mockPatient });
        assert.ok(!bundle.entry.some(e => !e || !e.resource));
        console.log("✅ Test 4: No undefined/null Bundle entries");
        passed++;
    } catch(e) { console.error("❌ Test 4 Failed", e); failed++; }

    // Test 5: Validation - throws on missing patient
    try {
        assert.throws(() => {
            buildDocumentBundle({});
        }, /Patient is required/);
        console.log("✅ Test 5: Validation rejects missing patient");
        passed++;
    } catch(e) { console.error("❌ Test 5 Failed", e); failed++; }

    console.log(`\nBundle Builder Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runBundleTests();

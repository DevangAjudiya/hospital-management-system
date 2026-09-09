const fhirMapper = require('./fhirMapper');

/**
 * Builds an ABDM-compatible FHIR R4 Document Bundle.
 *
 * @param {Object} input
 * @param {Object} input.patient - Mongoose Patient document (populated with userId)
 * @param {Array} input.consultations - Array of Mongoose Consultation documents (populated with doctorId)
 * @param {Array} input.prescriptions - Array of Mongoose Prescription documents (populated with medicines.medicineId)
 * @param {Array} input.labReports - Array of Mongoose LabReport documents
 * @returns {Object} FHIR R4 Bundle
 */
function buildDocumentBundle({ patient, consultations = [], prescriptions = [], labReports = [] }) {
    if (!patient || !patient._id) {
        throw new Error("Patient is required to build a Document Bundle");
    }

    const resources = [];

    // 1. Map Patient
    const patientResource = fhirMapper.mapPatient(patient);
    if (!patientResource) {
        throw new Error("Failed to map patient");
    }
    resources.push(patientResource);

    // 2. Map Consultations (Encounters & Conditions)
    const encounters = [];
    const conditions = [];
    consultations.forEach(c => {
        const encounter = fhirMapper.mapEncounter(c);
        if (encounter) {
            encounters.push(encounter);
            resources.push(encounter);
        }
        const condition = fhirMapper.mapCondition(c);
        if (condition) {
            conditions.push(condition);
            resources.push(condition);
        }
    });

    // 3. Map Prescriptions (MedicationStatements)
    const medications = [];
    prescriptions.forEach(p => {
        const stmts = fhirMapper.mapMedicationStatements(p);
        if (stmts && stmts.length > 0) {
            medications.push(...stmts);
            resources.push(...stmts);
        }
    });

    // 4. Map Lab Reports (Observations)
    const observations = [];
    labReports.forEach(l => {
        const obsList = fhirMapper.mapObservation(l);
        if (obsList && obsList.length > 0) {
            observations.push(...obsList);
            resources.push(...obsList);
        }
    });

    // 5. Build Composition
    // A FHIR Document must begin with a Composition.
    // Note: We are missing formal Practitioner and Organization resources because
    // the MediKiosk models don't currently have sufficient data to populate valid 
    // ABDM-compliant versions of these (like HPX registry IDs or facility IDs).
    // We safely use the 'display' field for author.
    
    // Determine the author display safely
    let authorDisplay = "MediKiosk System";
    if (consultations.length > 0 && consultations[0].doctorId && consultations[0].doctorId.name) {
        authorDisplay = consultations[0].doctorId.name;
    }

    // Determine the primary encounter safely
    let encounterRef = null;
    if (encounters.length > 0) {
        encounterRef = { reference: `Encounter/${encounters[0].id}` };
    }

    // Generate a deterministic or safe ID for Composition
    const compositionId = `comp-${patient._id.toString()}-${Date.now()}`;

    const composition = {
        resourceType: "Composition",
        id: compositionId,
        status: "final",
        type: {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "371530004",
                    display: "Clinical consultation report"
                }
            ]
        },
        subject: {
            reference: `Patient/${patientResource.id}`
        },
        date: new Date().toISOString(),
        author: [
            {
                display: authorDisplay
            }
        ],
        title: "Clinical Consultation Report"
    };

    if (encounterRef) {
        composition.encounter = encounterRef;
    }

    // Attach sections to Composition
    composition.section = [];

    // Add references to section entries
    const addSection = (title, code, display, resourceList) => {
        if (resourceList && resourceList.length > 0) {
            composition.section.push({
                title: title,
                code: {
                    coding: [{ system: "http://snomed.info/sct", code: code, display: display }]
                },
                entry: resourceList.map(r => ({ reference: `${r.resourceType}/${r.id}` }))
            });
        }
    };

    // Encounter and Condition (Clinical Notes section)
    const clinicalNotes = [...encounters, ...conditions];
    addSection("Clinical Notes", "371530004", "Clinical consultation report", clinicalNotes);

    // Medications
    addSection("Medications", "422836005", "Medication document", medications);

    // Observations
    addSection("Investigations", "4241000179101", "Laboratory report", observations);

    // 6. Build final Bundle
    const bundle = {
        resourceType: "Bundle",
        id: `bundle-${patient._id.toString()}-${Date.now()}`,
        meta: {
            profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"]
        },
        identifier: {
            system: "http://hip.in",
            value: `bundle-${patient._id.toString()}-${Date.now()}`
        },
        type: "document",
        timestamp: new Date().toISOString(),
        entry: []
    };

    // Bundle entry 0 must be the Composition
    bundle.entry.push({
        fullUrl: `Composition/${composition.id}`,
        resource: composition
    });

    // Append all other mapped resources
    resources.forEach(r => {
        bundle.entry.push({
            fullUrl: `${r.resourceType}/${r.id}`,
            resource: r
        });
    });

    return bundle;
}

module.exports = { buildDocumentBundle };

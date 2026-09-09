const fhirWriteback = require('./writeback/fhirWriteback');

/**
 * Parses and ingests an ABDM FHIR Bundle, mapping supported resources to MediKiosk models.
 */
async function ingestBundle(bundle, patientId) {
    if (!bundle || bundle.resourceType !== 'Bundle') {
        throw new Error("Invalid FHIR Bundle");
    }

    const summary = {
        totalEntries: bundle.entry?.length || 0,
        processed: [],
        skipped: [],
        errors: []
    };

    if (!bundle.entry) return summary;

    for (const entry of bundle.entry) {
        if (!entry.resource) continue;
        const res = entry.resource;

        try {
            // fhirWriteback handles Condition, MedicationStatement, Observation, Encounter, Patient
            if (['Condition', 'MedicationStatement', 'Observation', 'Encounter', 'Patient'].includes(res.resourceType)) {
                await fhirWriteback.writeResource(res, patientId);
                summary.processed.push(`${res.resourceType}/${res.id}`);
            } else {
                summary.skipped.push(`${res.resourceType}/${res.id || 'unknown'}`);
            }
        } catch (err) {
            summary.errors.push(`${res.resourceType}/${res.id}: ${err.message}`);
        }
    }

    return summary;
}

module.exports = { ingestBundle };

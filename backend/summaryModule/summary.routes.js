const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { generateSummary, updateSummaryTranslation } = require('./summary.service');
const Summary = require('./summary.model');
const { buildDocumentTimeline, buildInvestigations } = require('./adapters/documentAdapter');
const { authenticate } = require('../middleware/authMiddleware');
const { requireConsent } = require('../middleware/consentMiddleware');

// D3: Protected summary generation — requires authenticated patient + active consent.
// All three (A, B, C) funnel into this endpoint, so protecting it here gates all of them.
// Universal integration endpoint: Accepts payloads from Module A (Nisarg) & Module B (Devang)
router.post('/generate',
  authenticate,
  requireConsent({ purpose: 'kiosk-consultation', dataTypes: ['All'] }),
  async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready. Please try again.' });
    }

    const { interviewData, documentTimeline, analyzedDocuments } = req.body;
    // D3: Use server-side resolved patientId — never trust browser-supplied body.patientId
    // req.resolvedPatientId is set by requireConsent middleware after DB lookup from JWT

    const finalTimeline = documentTimeline || (analyzedDocuments ? buildDocumentTimeline(analyzedDocuments) : undefined);
    const finalInvestigations = analyzedDocuments ? buildInvestigations(analyzedDocuments) : [];
    // Call service layer with cross-module inputs (will safely fallback to mock data if empty)
    const structuredSummary = await generateSummary(interviewData, finalTimeline);

    // Save linked summary record to MongoDB
    console.log("-> Generating summary and saving to DB...");
    // Use the middleware-resolved patientId (server-side, not browser-supplied)
    const targetPatientId = req.resolvedPatientId ? req.resolvedPatientId.toString() : null;
    if (!targetPatientId) {
      return res.status(400).json({ success: false, error: 'Patient record could not be resolved.' });
    }
    const existingDoc = await Summary.findOne({ patientId: targetPatientId });

    // ★★★ NEW BLOCK — merge new timeline entries onto existing ones instead of
    // letting the upsert below silently overwrite/erase previously attached documents
    let mergedTimeline = structuredSummary.documentTimeline;
    if (existingDoc && existingDoc.documentTimeline && existingDoc.documentTimeline.length > 0) {
      const hadNewDocuments = Boolean(documentTimeline || analyzedDocuments);
      if (hadNewDocuments) {
        const newRealEntries = structuredSummary.documentTimeline.filter(item => {
        if (item.sourceDocument === 'System Default') return false;
        // Skip if an identical entry (same date + event) already exists — prevents
        // re-running /generate with the same document from creating duplicates
        const alreadyExists = existingDoc.documentTimeline.some(existing => {
          if (existing.event !== item.event || existing.sourceDocument !== item.sourceDocument) return false;
          if (item.type === 'prescription') {
            return new Date(existing.date).getTime() === new Date(item.date).getTime();
          }
          return true; // lab entries have no real date — event+sourceDocument match is enough
        });
        return !alreadyExists;
      });
      mergedTimeline = [...existingDoc.documentTimeline, ...newRealEntries];
      } else {
        // This call had no new documents — keep exactly what was already there
        mergedTimeline = existingDoc.documentTimeline;
      }
    }
    // ★★★ NEW BLOCK END

        // ★★★ NEW BLOCK — preserve existing narrative fields when this call
    // brought no new interviewData, instead of letting mock fallback
    // (or an unrelated document-only call) silently overwrite real saved text
    const hadNewInterviewData = Boolean(interviewData);
    let textFields;
    if (hadNewInterviewData) {
      textFields = {
        chiefComplaint: structuredSummary.chiefComplaint,
        hpi: structuredSummary.hpi,
        pastHistory: structuredSummary.pastHistory,
        drugHistory: structuredSummary.drugHistory,
        familyHistory: structuredSummary.familyHistory,
        personalHistory: structuredSummary.personalHistory,
        ros: structuredSummary.ros,
        languageOutputs: structuredSummary.languageOutputs,
        redFlagDetected: structuredSummary.redFlagDetected
      };
    } else if (existingDoc) {
      textFields = {
        chiefComplaint: existingDoc.chiefComplaint,
        hpi: existingDoc.hpi,
        pastHistory: existingDoc.pastHistory,
        drugHistory: existingDoc.drugHistory,
        familyHistory: existingDoc.familyHistory,
        personalHistory: existingDoc.personalHistory,
        ros: existingDoc.ros,
        languageOutputs: existingDoc.languageOutputs,
        redFlagDetected: existingDoc.redFlagDetected
      };
    } else {
      textFields = structuredSummary; // brand-new patient, nothing to preserve — mock fallback is fine here
    }

    // ★★★ NEW BLOCK — same problem, same fix, for investigations: a call with
    // only interviewData (no analyzedDocuments) must not wipe previously saved labs
    let finalInvestigationsToSave = finalInvestigations;
    if (finalInvestigations.length === 0) {
      if (!hadNewInterviewData && structuredSummary.investigations?.length) {
        // fell back to mock summary's investigations — don't save mock data
        finalInvestigationsToSave = existingDoc?.investigations || [];
      } else if (existingDoc?.investigations?.length) {
        finalInvestigationsToSave = existingDoc.investigations;
      } else {
        finalInvestigationsToSave = structuredSummary.investigations || [];
      }
    }
    // ★★★ NEW BLOCK END

    const doc = await Summary.findOneAndUpdate(
    { patientId: targetPatientId },
    {
      $set: {
        ...textFields,
        documentTimeline: mergedTimeline,
        investigations: finalInvestigationsToSave,
        patientId: targetPatientId,
        status: 'pending_review',
        updatedAt: Date.now()
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
    console.log("-> SUCCESS! Saved document ID:", doc._id);

    res.status(201).json({
      success: true,
      message: 'Summary successfully generated and integrated across modules.',
      data: doc
    });
  } catch (err) {
    console.error('Summary Generation Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch an existing summary by patientId (used by SummaryReviewPage on load —
// does NOT trigger generation, just reads whatever was already saved)
router.get('/by-patient/:patientId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready.' });
    }
    const doc = await Summary.findOne({ patientId: req.params.patientId }).sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ error: 'No summary found for this patient.' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status update state machine endpoint (Accept / Amend / Reject) & text persistence + dynamic re-translation
router.patch('/:id/status', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready.' });
    }

    const { status, chiefComplaint, hpi, pastHistory, drugHistory, familyHistory, personalHistory } = req.body;
    const validStatuses = ['draft', 'pending_review', 'accepted', 'amended', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid state machine status provided.' });
    }

    // Dynamically re-translate updated text fields into Hindi via IndicTrans2 when edits occur
    let languageOutputs = undefined;
    if (
      chiefComplaint !== undefined || 
      hpi !== undefined || 
      pastHistory !== undefined || 
      drugHistory !== undefined || 
      familyHistory !== undefined || 
      personalHistory !== undefined
    ) {
      const englishNarrative = `Chief Complaint: ${chiefComplaint || ''}. HPI: ${hpi || ''}. Past History: ${pastHistory || ''}. Drug History: ${drugHistory || ''}. Family History: ${familyHistory || ''}. Personal History: ${personalHistory || ''}`;
      languageOutputs = { en: englishNarrative, hi: '' }; // stale Hindi cleared; re-translated lazily on next Hindi tab click
    }

    // Build update payload, capturing text edits and newly translated outputs if provided
    const updateFields = {
      status,
      updatedAt: Date.now(),
      ...(chiefComplaint !== undefined && { chiefComplaint }),
      ...(hpi !== undefined && { hpi }),
      ...(pastHistory !== undefined && { pastHistory }),
      ...(drugHistory !== undefined && { drugHistory }),
      ...(familyHistory !== undefined && { familyHistory }),
      ...(personalHistory !== undefined && { personalHistory }),
      ...(languageOutputs !== undefined && { languageOutputs })
    };

    const updatedDoc = await Summary.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ error: 'Summary document not found.' });
    }

    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/audio', async (req, res) => {
  try {
    const { lang } = req.query;
    const doc = await Summary.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Summary not found' });

    const text = doc.languageOutputs?.[lang] || doc.languageOutputs?.en;
    if (!text) return res.status(400).json({ error: 'No narrative text available' });

    const ttsResponse = await fetch(process.env.TTS_ENDPOINT || 'http://localhost:5001/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: lang === 'hi' ? 'hi' : 'en' })
    });

    if (!ttsResponse.ok) {
      return res.status(502).json({ error: 'TTS service failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// On-demand Hindi translation: only called when user actually views the Hindi tab
router.get('/:id/translate', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready.' });
    }

    const { lang } = req.query;
    if (lang !== 'hi') {
      return res.status(400).json({ error: 'Only lang=hi is supported for on-demand translation.' });
    }

    const doc = await Summary.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Summary not found.' });

    // Already translated earlier — return cached value, skip re-translating
    if (doc.languageOutputs?.hi) {
      return res.json({ success: true, hi: doc.languageOutputs.hi });
    }

    const { translateTextViaIndicTrans2 } = require('./summary.service');
    const hindiTranslation = await translateTextViaIndicTrans2(doc.languageOutputs.en, 'hi');

    doc.languageOutputs.hi = hindiTranslation;
    await doc.save();

    res.json({ success: true, hi: hindiTranslation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
const mockInterview = require('./mocks/mockInterviewData');

// Flattens Nisarg's structured clinical_summary sections into readable text
// for the LLM prompt. Keeps the prompt shape-agnostic so small key-name
// corrections later (once real sample confirmed) don't require a rewrite.
function flattenQAList(list) {
  if (!Array.isArray(list) || list.length === 0) return 'None reported.';
  return list.map(item => {
    const answer = Array.isArray(item.answer) ? item.answer.join(', ') : item.answer;
    return `${item.question}: ${answer}`;
  }).join('; ');
}

function flattenNestedSections(obj) {
  if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return 'None reported.';
  return Object.entries(obj)
    .map(([section, list]) => `[${section}] ${flattenQAList(list)}`)
    .join(' | ');
}

function flattenAyush(ayush) {
  if (!ayush || Object.keys(ayush).length === 0) return 'None reported.';
  const parts = [];
  Object.entries(ayush).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      if (value[0].domain || value[0].label) {
        // nested domain-style structure (like dashavidha_pariksha)
        value.forEach(domain => {
          parts.push(`${domain.label || domain.domain}: ${flattenQAList(domain.answers || [])}`);
        });
      } else {
        // flat QA list (like ahara_vihara)
        parts.push(`${key}: ${flattenQAList(value)}`);
      }
    }
  });
  return parts.length > 0 ? parts.join(' | ') : 'None reported.';
}

async function translateTextViaIndicTrans2(englishText, targetLang = 'hi') {
  if (targetLang === 'en') return englishText;

  const translationEndpoint = process.env.INDICTRANS_LOCAL_ENDPOINT || 'http://localhost:5001/translate';

  try {
    const response = await fetch(translationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: englishText, src_lang: 'eng_Latn', tgt_lang: 'hin_Deva' })
    });
    const result = await response.json();
    // Explicitly check response status and ensure we extract text accurately
    if (!response.ok) {
      throw new Error(result.detail || 'Translation service returned an error status');
    }
    
    if (result.translatedText || result.translation) {
      return result.translatedText || result.translation;
    } else {
      throw new Error('Translation response missing expected text keys');
    }
  } catch (err) {
    console.error('Translation failed, check if FastAPI server on port 5001 is running:', err.message);
    // Return explicit error text so it shows up in UI instead of silently masking as a success string
  }

  return `[Translation Error: Python service at port 5001 unreachable]`;
}

function buildFallbackClinicalSummary(interviewData, documentTimeline) {
  const safeInterview = interviewData || mockInterview || {};
  const chiefComplaint = safeInterview.chief_complaint || safeInterview.chiefComplaint || 'Not reported';
  const hpi = typeof safeInterview.hpi === 'string'
    ? safeInterview.hpi
    : flattenQAList(safeInterview.hpi || []);

  // Nisarg's real interview data nests history under extended_history.{section},
  // but earlier mock/test shapes used flat past_history/drug_history keys.
  // Support both by checking nested first, then flat, then empty.
  const ext = safeInterview.extended_history || {};

  const rawPastHistory = safeInterview.past_history || ext.past_medical_history;
  const pastHistory = typeof rawPastHistory === 'string'
    ? rawPastHistory
    : flattenQAList(rawPastHistory || []);

  const rawDrugHistory = safeInterview.drug_history || ext.drug_history;
  const drugHistory = typeof rawDrugHistory === 'string'
    ? rawDrugHistory
    : flattenQAList(rawDrugHistory || []);

  const rawFamilyHistory = safeInterview.family_history || ext.family_history;
  const familyHistory = typeof rawFamilyHistory === 'string'
    ? rawFamilyHistory
    : flattenQAList(rawFamilyHistory || []);

  const rawPersonalHistory = safeInterview.personal_history || ext.personal_history;
  const personalHistory = typeof rawPersonalHistory === 'string'
    ? rawPersonalHistory
    : flattenQAList(rawPersonalHistory || []);

  const ros = Array.isArray(safeInterview.review_of_systems)
    ? safeInterview.review_of_systems
    : (safeInterview.review_of_systems ? Object.values(safeInterview.review_of_systems).flatMap(section => Array.isArray(section) ? section.map(item => item.answer || item.question || item) : []) : ['No ROS data recorded.']);

  const narrative = [
    `Chief Complaint: ${chiefComplaint}.`,
    `HPI: ${hpi}.`,
    `Past History: ${pastHistory}.`,
    `Drug History: ${drugHistory}.`,
    `Family History: ${familyHistory}.`,
    `Personal History: ${personalHistory}.`
  ].join(' ');

  return {
    chiefComplaint,
    hpi,
    pastHistory,
    drugHistory,
    familyHistory,
    personalHistory,
    ros: Array.isArray(ros) && ros.length ? ros : ['No ROS data recorded.'],
    investigations: Array.isArray(documentTimeline) ? documentTimeline
      .filter(item => item && (item.type === 'lab' || item.category === 'investigation' || item.name))
      .map(item => ({
        name: item.name || item.event || 'Investigation',
        value: item.value || item.result || 'Record uploaded',
        flag: item.flag || 'normal'
      })) : [],
    languageOutputs: { en: narrative, hi: '' }
  };
}


async function generateSummary(incomingInterviewData, incomingTimeline) {
  // Falls back to mock (Nisarg's real clinical_summary shape) when Module A
  // hasn't sent data yet — safe for isolated dev/testing.
  const interviewData = incomingInterviewData || mockInterview;
  const documentTimeline = Array.isArray(incomingTimeline) ? incomingTimeline : [];
  console.log('[SUMMARY] Generating summary for interviewData:', interviewData);
  console.log('[SUMMARY] Document timeline:', documentTimeline);
  const prompt = `
You are an expert clinical summarizer for a hospital kiosk system.
Synthesize the following structured patient interview data (from a conversational
intake engine) and historical document timeline (from OCR of prior records) into
a clinical summary.

Chief Complaint: ${interviewData.chief_complaint || interviewData.chiefComplaint || 'Not reported'}
HPI: ${flattenQAList(interviewData.hpi)}
Additional History: ${flattenQAList(interviewData.additional_history)}
Extended History: ${flattenNestedSections(interviewData.extended_history)}
Review of Systems: ${flattenNestedSections(interviewData.review_of_systems)}
AYUSH Assessment: ${flattenAyush(interviewData.ayush)}
Red Flags: ${interviewData.red_flags?.detected ? `Detected (severity: ${interviewData.red_flags.severity}) — ${(interviewData.red_flags.details || []).join(', ')}` : 'None detected.'}

Digitized Document Timeline (from Module B - OCR/Extraction):
${JSON.stringify(documentTimeline, null, 2)}

Respond ONLY as a valid JSON object matching this exact structure:
{
  "chiefComplaint": "string",
  "hpi": "string",
  "pastHistory": "string",
  "drugHistory": "string",
  "familyHistory": "string",
  "personalHistory": "string",
  "ros": ["string"],
  "investigations": [{"name": "string", "value": "string", "flag": "string"}],
  "languageOutputs": {
    "en": "English clinical summary paragraph combining chief complaint and HPI.",
    "hi": ""
  }
}
`;

  let parsed;
  const usingFallback = !process.env.OPENAI_API_KEY;

  if (usingFallback) {
    console.warn('[SUMMARY] OPENAI_API_KEY missing; using local fallback summary generation.');
    parsed = buildFallbackClinicalSummary(interviewData, documentTimeline);
  } else {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI API summarization failed');
      }
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('OpenAI response did not include any content.');
      }
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err) {
      console.warn('[SUMMARY] OpenAI unavailable; using local fallback summary generation.', err.message);
      parsed = buildFallbackClinicalSummary(interviewData, documentTimeline);
    }
  }

  const englishNarrative = parsed.languageOutputs?.en || `Chief Complaint: ${parsed.chiefComplaint}. HPI: ${parsed.hpi}`;
  parsed.languageOutputs = { en: englishNarrative, hi: '' }; // Hindi generated lazily, on-demand via GET /:id/translate

  const normalizedTimeline = Array.isArray(documentTimeline) && documentTimeline.length > 0
    ? documentTimeline.map(item => {
        const d = item.date ? new Date(item.date) : new Date();
        const safeDate = isNaN(d.getTime()) ? new Date() : d;
        return {
          date: safeDate,
          event: item.event || item.title || 'Digitized Document Record',
          sourceDocument: item.sourceDocument || item.documentType || 'Kiosk Upload',
          type: item.type || 'document'
        };
      })
    : [{ date: new Date(), event: 'Initial kiosk intake synchronized', sourceDocument: 'System Default' }];

  // Carries Nisarg's red-flag signal through — useful once alert routing exists
  return {
    ...parsed,
    documentTimeline: normalizedTimeline,
    redFlagDetected: Boolean(interviewData?.red_flags?.detected || false)
  };
}

async function updateSummaryTranslation(updatedFields) {
  const englishNarrative = `Chief Complaint: ${updatedFields.chiefComplaint || ''}. HPI: ${updatedFields.hpi || ''}. Past History: ${updatedFields.pastHistory || ''}. Drug History: ${updatedFields.drugHistory || ''}. Family History: ${updatedFields.familyHistory || ''}. Personal History: ${updatedFields.personalHistory || ''}`;
  const hindiTranslation = await translateTextViaIndicTrans2(englishNarrative, 'hi');
  return { en: englishNarrative, hi: hindiTranslation };
}

module.exports = { generateSummary, updateSummaryTranslation, translateTextViaIndicTrans2 };    //(Bilingual EN/HI: lazy Hindi translation via IndicTrans2, TTS audio playback, fast Accept/Amend)

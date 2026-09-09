/**
 * Summary API Service
 * 
 * Encapsulates communication with Person 4 (Vedanti)'s summary backend:
 * - POST /api/summary/generate
 * - PATCH /api/summary/:id/status
 * - GET /api/summary/:id/translate?lang=hi
 * - GET /api/summary/:id/audio?lang=en|hi
 */

const BASE_URL = '/api/summary';

/**
 * Fetches a saved summary by patient ID.
 * @param {string} patientId
 * @returns {Promise<Object>} The summary document data
 */
export async function getSummaryByPatient(patientId) {
  if (!patientId) {
    console.log('[SUMMARY RETRIEVAL] patientId:', patientId);
    console.log('[SUMMARY RETRIEVAL] response: Patient ID is required');
    throw new Error('Patient ID is required');
  }

  const res = await fetch(`${BASE_URL}/by-patient/${encodeURIComponent(patientId)}`);
  const json = await res.json().catch(() => ({}));
  console.log('[SUMMARY RETRIEVAL] patientId:', patientId);
  console.log('[SUMMARY RETRIEVAL] response:', json);

  if (!res.ok) {
    throw new Error(json.error || json.message || 'Clinical summary has not been generated for this patient yet.');
  }

  return json.data || json;
}

/**
 * Fetches a saved summary by summary document ID.
 * @param {string} id
 * @returns {Promise<Object>} The summary document data
 */
export async function getSummaryById(id) {
  if (!id) throw new Error('Summary ID is required');

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || 'Summary not found');
  }

  return json.data || json;
}

/**
 * Generates or fetches an integrated clinical summary.
 * D3: Route now requires authentication + active consent.
 *     patientId is resolved server-side from JWT — do NOT send it in body.
 *
 * @param {Object} params
 * @param {Object} [params.interviewData]
 * @param {Array}  [params.documentTimeline]
 * @param {Array}  [params.analyzedDocuments]
 * @returns {Promise<Object>} The summary document data
 */
export async function generateSummary({
  interviewData,
  documentTimeline,
  analyzedDocuments
} = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // D3: patientId is intentionally omitted — the backend resolves it from JWT
  const payload = {};
  if (interviewData) payload.interviewData = interviewData;
  if (documentTimeline) payload.documentTimeline = documentTimeline;
  if (analyzedDocuments) payload.analyzedDocuments = analyzedDocuments;

  const res = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to generate summary');
  }

  return json.data || json;
}


/**
 * Updates summary status and saves doctor amendments/edits.
 * @param {string} id - The MongoDB ObjectId of the summary document
 * @param {Object} updateData - Status and edited field values
 * @returns {Promise<Object>} Updated summary document data
 */
export async function updateSummaryStatus(id, updateData) {
  if (!id) throw new Error('Summary ID is required to update status');

  const res = await fetch(`${BASE_URL}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to update summary status');
  }

  return json.data || json;
}

/**
 * Requests on-demand Hindi translation of the clinical summary narrative.
 * @param {string} id - The summary document ID
 * @returns {Promise<string>} Translated Hindi text
 */
export async function fetchHindiTranslation(id) {
  if (!id) throw new Error('Summary ID is required for translation');

  const res = await fetch(`${BASE_URL}/${id}/translate?lang=hi`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to fetch Hindi translation');
  }

  return json.hi;
}

/**
 * Returns the TTS audio endpoint URL for a given summary and language.
 * @param {string} id - The summary document ID
 * @param {'en'|'hi'} [lang='en']
 * @returns {string} Endpoint URL for direct audio streaming
 */
export function getAudioStreamUrl(id, lang = 'en') {
  return `${BASE_URL}/${id}/audio?lang=${lang}`;
}

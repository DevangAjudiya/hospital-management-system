// frontend/src/features/document-digitization/services/devangService.js
// D3: Devang Document Analysis — routed through consent-gated Node proxy
//
// BEFORE D3: Browser → http://15.206.164.15:8000/analyze  (external, no consent check)
// AFTER  D3: Browser → /api/document/analyze?type=... → consentMiddleware → Devang AI
//
// This ensures NO document content leaves the browser without a valid GRANTED consent.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/** Retrieve auth header from localStorage */
function getAuthHeader() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated. Please log in from the Patient Dashboard.');
  return { 'Authorization': `Bearer ${token}` };
}

/**
 * Sends a prescription or lab report file through the consent-gated Node proxy
 * to Devang's document analysis microservice.
 *
 * @param {File} file - The uploaded prescription or lab report (PDF or image).
 * @param {'prescription' | 'lab'} type - Document category.
 * @returns {Promise<any>} Raw Devang API response object.
 */
export async function analyzeDocumentWithDevang(file, type = 'prescription') {
  const formData = new FormData();
  // Devang OpenAPI specification specifies multipart field name "file"
  formData.append('file', file);

  // Route through Node proxy with ?type= to select /analyze or /analyze-lab-report
  const url = new URL(`${BACKEND_URL}/api/document/analyze`);
  url.searchParams.append('type', type === 'lab' ? 'lab' : 'prescription');

  console.log(`[DEVANG] Submitting ${type} document (${file.name}, ${(file.size / 1024).toFixed(1)} KB) via proxy to ${url.toString()}...`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: getAuthHeader(),   // DO NOT set Content-Type — FormData sets the multipart boundary
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`[DEVANG] API Error (${response.status}):`, errorText);
    throw new Error(`Document Analysis Service returned status ${response.status}: ${errorText}`);
  }

  // Schema is open ({}) — keep and log the raw response without schema assumptions
  const rawResponse = await response.json();
  console.log('[DEVANG RAW RESPONSE]:', rawResponse);
  return rawResponse;
}

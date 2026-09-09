/**
 * D3 Interview API Service — routes through Node proxy (consent-gated)
 *
 * BEFORE D3: Browser → External AI (vps-nisarg.../interview)
 * AFTER  D3: Browser → Node /api/kiosk/interview → consentMiddleware → External AI
 *
 * All calls now go through the MediKiosk backend which enforces:
 *  - JWT authentication
 *  - Server-side patient resolution
 *  - Active GRANTED consent check
 *  - Only then forwards to the Nisarg AI service
 *
 * Transport preserved:
 *  - /interview  : JSON POST (identical payload)
 *  - /transcribe : multipart/form-data WAV (identical payload)
 *
 * The proxy BASE_URL is the local MediKiosk Node backend.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/** Retrieve the patient JWT from localStorage */
function getAuthHeader() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated. Please log in from the Patient Dashboard.');
  return { 'Authorization': `Bearer ${token}` };
}

/**
 * Starts a new interview session.
 * Routed through: POST /api/kiosk/interview (consent-gated Node proxy)
 */
export async function startInterview(
  language = 'en',
  assessmentType = 'modern',
  initialComplaint = '',
  inputMode = 'touch',
  ayushAssessments = null
) {
  const resolvedAyush = assessmentType === 'ayush'
    ? (Array.isArray(ayushAssessments) && ayushAssessments.length > 0 ? ayushAssessments : ['dashavidha_pariksha', 'ahara_vihara'])
    : [];

  const payload = {
    input_mode: inputMode || 'touch',
    language: language || 'en',
    assessment_type: assessmentType || 'modern',
    ayush_assessments: resolvedAyush,
    patient_id: null,
    patient_message: initialComplaint || ""
  };

  const response = await fetch(`${BACKEND_URL}/api/kiosk/interview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errData = await response.json();
      errMsg = errData.message || errData.error || errData.detail || errMsg;
    } catch { /* ignore */ }
    throw new Error(`Failed to start consultation: ${errMsg}`);
  }

  return response.json();
}

/**
 * Submits an answer to the interview API.
 * Routed through: POST /api/kiosk/interview (consent-gated Node proxy)
 */
export async function submitInterviewAnswer(
  sessionId,
  language = 'en',
  assessmentType = 'modern',
  patientMessage,
  inputMode = 'touch',
  ayushAssessments = []
) {
  const resolvedAyush = assessmentType === 'ayush'
    ? (Array.isArray(ayushAssessments) && ayushAssessments.length > 0 ? ayushAssessments : ['dashavidha_pariksha', 'ahara_vihara'])
    : [];

  const payload = {
    session_id: sessionId,
    patient_id: null,
    input_mode: inputMode || 'touch',
    patient_message: patientMessage,
    language: language || 'en',
    assessment_type: assessmentType || 'modern',
    ayush_assessments: resolvedAyush
  };

  const startTime = performance.now();
  console.log('[VOICE] /interview request payload:', JSON.stringify(payload));
  console.log('[VOICE] /interview session_id:', sessionId);
  console.log('[VOICE] /interview patient_message:', patientMessage);
  console.log('[VOICE] /interview input_mode:', inputMode);
  console.log('[VOICE] /interview language:', language);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BACKEND_URL}/api/kiosk/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const duration = (performance.now() - startTime).toFixed(1);
    console.log(`[VOICE] /interview response received in ${duration}ms, status: ${response.status}`);

    if (!response.ok) {
      console.error('[VOICE] /interview non-ok status:', response.status, response.statusText);
      let errMsg = response.statusText;
      try {
        const errData = await response.json();
        errMsg = errData.message || errData.error || errData.detail || errMsg;
      } catch { /* ignore */ }
      throw new Error(`Failed to submit response: ${errMsg}`);
    }

    const responseData = await response.json();
    console.log('[VOICE] /interview response body:', JSON.stringify(responseData));
    console.log('[VOICE] /interview next_question:', responseData.next_question ? JSON.stringify(responseData.next_question) : 'null');
    console.log('[VOICE] /interview interview_complete:', responseData.interview_complete);
    console.log('[VOICE] /interview red_flag_detected:', responseData.red_flag_detected);
    return responseData;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Interview request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Transcribes audio.
 * Routed through: POST /api/kiosk/transcribe (consent-gated Node proxy)
 * Transport: multipart/form-data WAV — identical to original
 */
export async function transcribeAudio(audioBlob, language, extension = 'wav') {
  const formData = new FormData();
  const filename = `recording.${extension || 'wav'}`;
  formData.append('audio', audioBlob, filename);

  const url = new URL(`${BACKEND_URL}/api/kiosk/transcribe`);
  if (language) {
    url.searchParams.append('language', language);
  }

  const startTime = performance.now();
  console.log(`[VOICE] /transcribe request started: language=${language}, extension=${extension}, blobType=${audioBlob?.type}, blobSize=${audioBlob?.size}, filename=${filename}, url=${url.toString()}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: getAuthHeader(),   // multipart boundary set automatically by FormData; no Content-Type override
      body: formData,
      signal: controller.signal
    });

    const duration = (performance.now() - startTime).toFixed(1);
    console.log(`[VOICE] /transcribe response received in ${duration}ms, status: ${response.status}`);
    if (!response.ok) {
      console.error('[VOICE] /transcribe non-ok status:', response.status, response.statusText);
      let errMsg = response.statusText;
      try {
        const errData = await response.json();
        if (errData) {
          if (Array.isArray(errData.detail)) {
            errMsg = errData.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
          } else {
            errMsg = errData.detail || errData.message || errData.error || errMsg;
          }
        }
      } catch { /* ignore */ }
      throw new Error(`Failed to transcribe audio: ${errMsg}`);
    }

    const transcribeResult = await response.json();
    console.log('[VOICE] /transcribe response body:', JSON.stringify(transcribeResult));
    console.log('[VOICE] /transcribe success:', transcribeResult.success);
    console.log('[VOICE] /transcribe transcript:', transcribeResult.transcript);
    return transcribeResult;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Transcription request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health check — still calls the external AI directly (no clinical data, no consent needed)
 */
export async function checkHealth() {
  const NISARG_URL = import.meta.env.VITE_INTERVIEW_API_BASE_URL || 'https://vps-nisarg-10gb-bjyqw.aiccloud.online';
  const response = await fetch(`${NISARG_URL}/health`);
  if (!response.ok) {
    throw new Error('API is not healthy');
  }
  return response.json();
}

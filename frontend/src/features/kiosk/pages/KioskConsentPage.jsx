/**
 * KioskConsentPage — D3 Consent-First Gate
 *
 * Displayed between KioskHome (language selection) and KioskInterview.
 * The patient MUST explicitly consent before any A/B/C clinical processing begins.
 *
 * Consent State Machine:
 *   PATIENT_IDENTIFIED → CONSENT_PENDING → CONSENT_GRANTED → ACTIVE_SESSION
 *                                        → CONSENT_REJECTED → (session ends)
 *
 * audioConsentProvided:
 *   true  = patient explicitly clicked "Hear Instructions" (speech played)
 *   false = patient did not click it (never inferred from page load)
 *
 * On [I Consent]:
 *   → POST /api/consent  (existing consent API)
 *   → navigate to /kiosk/interview
 *
 * On [Decline]:
 *   → POST /api/consent/decline (audit only)
 *   → navigate back to /kiosk
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaShieldHeart,
  FaVolumeHigh,
  FaVolumeXmark,
  FaCheck,
  FaTimes,
  FaArrowRight,
  FaMicrophone,
  FaFileLines,
  FaBrain,
  FaLock
} from 'react-icons/fa6';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const CONSENT_PURPOSE = 'kiosk-consultation';
const CONSENT_EXPIRY_HOURS = 4; // local session expiry

// ─── Consent explanation text ──────────────────────────────────────────────────
const CONSENT_SPEECH = {
  en: `Welcome. Before we begin, we need your permission to collect and process your health information. 
       During this session, we will collect your spoken answers and symptom information using Module A, 
       any medical documents you upload using Module B, 
       and generate a clinical summary using Module C.
       This information will be used only to support your consultation with our doctors today. 
       You may decline at any time. 
       Press "I Consent" to continue, or "Decline" to exit.`,
  hi: `स्वागत है। शुरू करने से पहले, हमें आपकी स्वास्थ्य जानकारी एकत्र करने और संसाधित करने की अनुमति चाहिए।
       इस सत्र में, हम आपके बोले गए उत्तर और लक्षण जानकारी एकत्र करेंगे,
       आपके द्वारा अपलोड किए गए चिकित्सा दस्तावेज़, और एक नैदानिक सारांश तैयार करेंगे।
       यह जानकारी केवल आज आपके डॉक्टर के साथ परामर्श के लिए उपयोग की जाएगी।
       आप किसी भी समय अस्वीकार कर सकते हैं।
       जारी रखने के लिए "मैं सहमत हूँ" दबाएँ, या बाहर निकलने के लिए "अस्वीकार करें" दबाएँ।`,
  gu: `સ્વાગત છે. શરૂ કરતા પહેલા, અમને તમારી આરોગ્ય માહિતી એકત્ર કરવા અને પ્રક્રિયા કરવાની પરવાનગી જોઈએ છે.
       આ સત્ર દરમિયાન, અમે તમારા બોલેલા જવાબો અને લક્ષણ માહિતી, 
       અને ક્લિનિકલ સારાંશ બનાવીશું.
       આ માહિતી ફક્ત આજના ડૉક્ટર સાથેના પરામર્શ માટે ઉપયોગ થશે.
       "હું સંમત છું" દબાવો અથવા "નકારો" દબાવો.`
};

const CONSENT_LABELS = {
  en: { hear: 'Hear Instructions', stop: 'Stop', consent: 'I Consent', decline: 'Decline', loading: 'Saving consent...' },
  hi: { hear: 'निर्देश सुनें', stop: 'रोकें', consent: 'मैं सहमत हूँ', decline: 'अस्वीकार करें', loading: 'सहमति सहेजी जा रही है...' },
  gu: { hear: 'સૂચનાઓ સાંભળો', stop: 'રોકો', consent: 'હું સંમત છું', decline: 'નકારો', loading: 'સહમતિ સાચવી રહ્યા છીએ...' }
};

export default function KioskConsentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const language = location.state?.language || 'en';
  const assessmentType = location.state?.assessmentType || 'modern';
  const patientId = location.state?.patientId || null;

  // audioConsentProvided: tracks ONLY explicit click on [Hear Instructions]
  // Never inferred from page load, autoplay, or speech synthesis availability.
  const [audioConsentProvided, setAudioConsentProvided] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [consentState, setConsentState] = useState('CONSENT_PENDING'); // state machine
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const labels = CONSENT_LABELS[language] || CONSENT_LABELS.en;

  // Log CONSENT_VIEWED on mount (audit only)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${BACKEND_URL}/api/consent/viewed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ patientId })
    }).catch(err => console.warn('[Consent] Could not log CONSENT_VIEWED:', err.message));

    // Cancel any ongoing speech on unmount
    return () => { window.speechSynthesis?.cancel(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── [Hear Instructions] ──────────────────────────────────────────────────────
  const handleHearInstructions = () => {
    if (!('speechSynthesis' in window)) {
      alert('Audio instructions are not supported by this browser.');
      return;
    }
    window.speechSynthesis.cancel();

    const text = CONSENT_SPEECH[language] || CONSENT_SPEECH.en;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Only set true here — only if user explicitly triggered this
      setAudioConsentProvided(true);
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    // Mark immediately when they clicked — speech starting is evidence of intent
    setAudioConsentProvided(true);
  };

  const handleStopInstructions = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    // audioConsentProvided remains true — they did click the button
  };

  // ── [I Consent] ───────────────────────────────────────────────────────────────
  const handleConsent = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to consent. Please log in from the Patient Dashboard first.');
      return;
    }
    if (!patientId) {
      setError('Patient identity could not be resolved. Please start from the Patient Dashboard.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const expiresAt = new Date(Date.now() + CONSENT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      const res = await fetch(`${BACKEND_URL}/api/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId,
          purpose: CONSENT_PURPOSE,
          requestedDataTypes: ['All'],
          expiresAt,
          audioConsentProvided  // tracks actual user interaction
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record consent');
      }

      setConsentState('CONSENT_GRANTED');
      // Navigate to interview — consent is now GRANTED in the DB
      navigate('/kiosk/interview', {
        state: { patientId, language, assessmentType, consentId: data.consent?._id }
      });
    } catch (err) {
      console.error('[Consent] Consent creation failed:', err);
      setError(err.message || 'An error occurred. Please try again or speak to staff.');
    } finally {
      setLoading(false);
    }
  };

  // ── [Decline] ─────────────────────────────────────────────────────────────────
  const handleDecline = async () => {
    window.speechSynthesis?.cancel();
    setConsentState('CONSENT_REJECTED');

    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${BACKEND_URL}/api/consent/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ patientId, purpose: CONSENT_PURPOSE })
      }).catch(err => console.warn('[Consent] Could not log decline:', err.message));
    }

    navigate('/kiosk');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-400 text-3xl mb-4">
            <FaShieldHeart />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Privacy & Consent</h1>
          <p className="text-slate-400 text-base">Please review before we begin your consultation</p>
        </div>

        {/* Consent Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-6">
          
          {/* What will be collected */}
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <FaLock className="text-teal-400 text-sm" />
            What information will be collected
          </h2>
          <div className="space-y-3 mb-6">
            {[
              { icon: <FaMicrophone />, label: 'Module A', desc: 'Your spoken answers and symptom descriptions during the AI interview' },
              { icon: <FaFileLines />, label: 'Module B', desc: 'Any medical documents or lab reports you choose to upload' },
              { icon: <FaBrain />, label: 'Module C', desc: 'A clinical summary generated from the above, shared with your doctor' }
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <div className="text-teal-400 mt-0.5 flex-shrink-0">{item.icon}</div>
                <div>
                  <span className="text-white font-semibold text-sm">{item.label}: </span>
                  <span className="text-slate-300 text-sm">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Purpose + rights */}
          <div className="bg-teal-500/10 border border-teal-400/20 rounded-xl p-4 mb-6 text-sm text-slate-300">
            <p className="mb-1">✓ Used <strong>only</strong> for today's consultation with our medical staff</p>
            <p className="mb-1">✓ Stored securely in compliance with health data regulations</p>
            <p className="mb-1">✓ You may <strong>decline at any time</strong> without affecting your care</p>
            <p>✓ Declining means AI-assisted clinical modules will not be used</p>
          </div>

          {/* Hear Instructions button */}
          <div className="flex justify-center mb-6">
            {!isSpeaking ? (
              <button
                type="button"
                onClick={handleHearInstructions}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
              >
                <FaVolumeHigh className="text-teal-400" />
                <span>{labels.hear}</span>
                {audioConsentProvided && <FaCheck className="text-emerald-400 text-xs" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopInstructions}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm animate-pulse"
              >
                <FaVolumeXmark />
                <span>{labels.stop}</span>
              </button>
            )}
          </div>

          {audioConsentProvided && (
            <p className="text-center text-xs text-emerald-400 mb-4 flex items-center justify-center gap-1">
              <FaCheck /> Audio instructions confirmed
            </p>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-500/10 border border-red-400/30 text-red-300 rounded-xl p-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleConsent}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl shadow-lg shadow-teal-500/30 transition-all cursor-pointer"
              id="kiosk-consent-grant-btn"
            >
              {loading ? (
                <span>{labels.loading}</span>
              ) : (
                <>
                  <FaCheck />
                  <span>{labels.consent}</span>
                  <FaArrowRight className="text-sm" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-transparent hover:bg-red-500/10 border border-red-400/40 hover:border-red-400/60 text-red-400 font-bold text-base rounded-2xl transition-all cursor-pointer"
              id="kiosk-consent-decline-btn"
            >
              <FaTimes />
              <span>{labels.decline}</span>
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs">
          MultiSpecialist Hospital • Patient Data Protection Policy
        </p>
      </div>
    </div>
  );
}

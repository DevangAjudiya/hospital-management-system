import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  FaLanguage,
  FaVolumeHigh,
  FaVolumeXmark,
  FaArrowRight,
  FaHeartPulse,
  FaShieldHeart,
  FaCheck,
  FaUserInjured
} from 'react-icons/fa6';

import './kiosk.css';
import KioskNavbar from './components/KioskNavbar';
import { SUPPORTED_LANGUAGES, playTextToSpeech, stopSpeech } from './services/languageService';
import { getKioskStrings } from './utils/kioskLocalization';

function KioskHome() {
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState(location.state?.language || localStorage.getItem('kiosk_language') || 'en');
  const [showLanguages, setShowLanguages] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop any active TTS audio playback on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const speakInstructions = async () => {
    const currentStrings = getKioskStrings(language);
    await playTextToSpeech(currentStrings.speechText, language, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (err) => {
        setIsSpeaking(false);
        console.warn('[KIOSK] Speech playback error:', err.message);
        alert(err.message || currentStrings.audioInstructionsUnavailable);
      }
    });
  };

  const handleStopInstructions = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  const selectLanguage = (code) => {
    stopSpeech();
    setIsSpeaking(false);
    setLanguage(code);
    localStorage.setItem('kiosk_language', code);
    setShowLanguages(false);
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const patientId = location.state?.patientId || localStorage.getItem("hmsPatientId") || user.patientId || null;

  const startConsultation = () => {
    // D3: Navigate to consent page first — clinical session only begins after explicit consent
    stopSpeech();
    localStorage.setItem('kiosk_language', language);
    navigate('/kiosk/consent', {
      state: {
        patientId,
        language,
        assessmentType: 'modern'
      }
    });
  };

  const currentContent = getKioskStrings(language);

  return (
    <div className="kiosk-page">
      {/* Decorative background */}
      <div className="kiosk-decoration kiosk-decoration-one"></div>
      <div className="kiosk-decoration kiosk-decoration-two"></div>

      {/* HEADER */}
      <KioskNavbar
        topBarTag={currentContent.consultationTitle}
        rightAction={
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 border-2 border-teal-200 hover:border-teal-300 text-teal-700 hover:text-teal-800 hover:bg-teal-50 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
              onClick={() => {
                stopSpeech();
                navigate('/patient-dashboard');
              }}
              aria-label="Patient Dashboard"
            >
              <FaUserInjured className="text-xs sm:text-sm text-teal-600" />
              <span>Patient Dashboard</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              onClick={() => setShowLanguages(!showLanguages)}
              aria-label="Select language"
            >
              <FaLanguage className="text-base" />
              <span>{currentContent.language}</span>
            </button>
          </div>
        }
      />

      {/* LANGUAGE PANEL */}
      {showLanguages && (
        <div className="kiosk-language-panel">
          <div className="language-panel-header">
            <FaLanguage />
            <h2>{currentContent.selectLanguage}</h2>
          </div>

          <div className="language-options">
            {SUPPORTED_LANGUAGES.map((item) => (
              <button
                key={item.code}
                className={
                  language === item.code
                    ? 'language-option active'
                    : 'language-option'
                }
                onClick={() => selectLanguage(item.code)}
              >
                <span>{item.nativeName}</span>
                {language === item.code && <FaCheck />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="kiosk-main">
        <div className="kiosk-content">
          {/* Medical icon */}
          <div className="kiosk-heart-icon">
            <FaHeartPulse />
          </div>

          {/* Heading */}
          <div className="kiosk-heading">
            <span className="kiosk-eyebrow">
              {currentContent.patientAssistance}
            </span>

            <h2>{currentContent.welcome}</h2>
            <h3>{currentContent.subtitle}</h3>
          </div>

          {/* Description */}
          <p className="kiosk-description">
            {currentContent.description}
          </p>

          {/* AUDIO */}
          {!isSpeaking ? (
            <button
              className="kiosk-audio-button"
              onClick={speakInstructions}
            >
              <span className="kiosk-audio-icon">
                <FaVolumeHigh />
              </span>
              <span>{currentContent.hear}</span>
            </button>
          ) : (
            <button
              className="kiosk-audio-button speaking"
              onClick={handleStopInstructions}
            >
              <span className="kiosk-audio-icon">
                <FaVolumeXmark />
              </span>
              <span>{currentContent.stop}</span>
            </button>
          )}

          {/* START CONSULTATION */}
          <button
            className="kiosk-start-button"
            onClick={startConsultation}
          >
            <span>{currentContent.start}</span>
            <FaArrowRight />
          </button>

          <p className="kiosk-tap-hint">
            {currentContent.tap}
          </p>

          {/* TRUST */}
          <div className="kiosk-trust">
            <div>
              <FaShieldHeart />
              <span>{currentContent.protected}</span>
            </div>

            <div>
              <FaCheck />
              <span>{currentContent.secure}</span>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="kiosk-footer">
        <span>{currentContent.copyright}</span>
        <span className="footer-divider">|</span>
        <span>{currentContent.patientAssistance}</span>
      </footer>
    </div>
  );
}

export default KioskHome;
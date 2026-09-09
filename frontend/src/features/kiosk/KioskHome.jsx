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
  FaUserInjured,
  FaXmark,
  FaMagnifyingGlass,
  FaStethoscope,
  FaLeaf
} from 'react-icons/fa6';

import './kiosk.css';
import KioskNavbar from './components/KioskNavbar';
import { SUPPORTED_LANGUAGES, getLanguageByCode, playTextToSpeech, stopSpeech } from './services/languageService';
import { getKioskStrings } from './utils/kioskLocalization';

function KioskHome() {
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState(location.state?.language || localStorage.getItem('kiosk_language') || 'en');
  const [showLanguages, setShowLanguages] = useState(false);
  const [langSearch, setLangSearch] = useState('');
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
    setLangSearch('');
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const patientId = location.state?.patientId || localStorage.getItem("hmsPatientId") || user.patientId || null;

  const startConsultation = (type = 'modern') => {
    // D3: Navigate to consent page first — clinical session only begins after explicit consent
    stopSpeech();
    localStorage.setItem('kiosk_language', language);
    localStorage.setItem('kiosk_assessment_type', type);
    navigate('/kiosk/consent', {
      state: {
        patientId,
        language,
        assessmentType: type
      }
    });
  };

  const currentContent = getKioskStrings(language);
  const currentLangConfig = getLanguageByCode(language);

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((item) => {
    if (!langSearch.trim()) return true;
    const q = langSearch.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.nativeName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q)
    );
  });

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
              aria-label={currentContent.patientDashboard}
            >
              <FaUserInjured className="text-xs sm:text-sm text-teal-600" />
              <span>{currentContent.patientDashboard}</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 border-2 border-teal-300 bg-teal-50/70 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
              onClick={() => setShowLanguages(!showLanguages)}
              aria-label="Select language"
            >
              <FaLanguage className="text-base text-teal-600" />
              <span>{currentLangConfig.nativeName} ({currentLangConfig.name})</span>
            </button>
          </div>
        }
      />

      {/* 23-LANGUAGE SELECTION MODAL */}
      {showLanguages && (
        <div
          className="kiosk-language-modal-backdrop"
          onClick={() => setShowLanguages(false)}
        >
          <div
            className="kiosk-language-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="language-panel-header">
              <div className="language-panel-header-left">
                <FaLanguage />
                <h2>{currentContent.selectLanguage} (23 Languages)</h2>
              </div>
              <button
                type="button"
                className="language-panel-close-btn"
                onClick={() => setShowLanguages(false)}
                aria-label="Close language selector"
              >
                <FaXmark />
              </button>
            </div>

            {/* Quick Search */}
            <div className="language-search-wrapper relative">
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search by language name or script (e.g. Tamil, ગુજરાતી, Hindi)..."
                className="language-search-input pl-10"
                autoFocus
              />
              <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            </div>

            {/* 23-Language Grid */}
            <div className="language-options-grid">
              {filteredLanguages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={
                    language === item.code
                      ? 'language-option active'
                      : 'language-option'
                  }
                  onClick={() => selectLanguage(item.code)}
                >
                  <div className="language-option-text">
                    <span className="language-option-native">{item.nativeName}</span>
                    <span className="language-option-english">{item.name} ({item.code})</span>
                  </div>
                  {language === item.code && (
                    <div className="language-option-check">
                      <FaCheck />
                    </div>
                  )}
                </button>
              ))}
              {filteredLanguages.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 font-semibold">
                  No matching language found for "{langSearch}"
                </div>
              )}
            </div>
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

          {/* CONSULTATION MODE SELECTION: MODERN vs AYUSH */}
          <div className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            {/* 1. Modern Consultation */}
            <button
              type="button"
              className="group relative flex flex-col items-start justify-between p-6 sm:p-7 rounded-3xl border-2 border-teal-200/80 bg-white/90 hover:bg-white hover:border-teal-500 hover:shadow-xl hover:shadow-teal-100/50 active:scale-[0.98] transition-all duration-200 text-left cursor-pointer shadow-sm"
              onClick={() => startConsultation('modern')}
              id="kiosk-mode-modern-btn"
            >
              <div className="w-full flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-400/30 text-teal-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  <FaStethoscope />
                </div>
                <span className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                  <FaArrowRight className="text-xs" />
                </span>
              </div>
              <div className="w-full">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 inline-block mb-2">
                  Allopathy • Clinical
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-teal-900 leading-tight mb-1.5">
                  {currentContent.modernConsultation}
                </h4>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  {currentContent.modernConsultationDesc}
                </p>
              </div>
            </button>

            {/* 2. AYUSH Consultation */}
            <button
              type="button"
              className="group relative flex flex-col items-start justify-between p-6 sm:p-7 rounded-3xl border-2 border-emerald-200/80 bg-white/90 hover:bg-white hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100/50 active:scale-[0.98] transition-all duration-200 text-left cursor-pointer shadow-sm"
              onClick={() => startConsultation('ayush')}
              id="kiosk-mode-ayush-btn"
            >
              <div className="w-full flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  <FaLeaf />
                </div>
                <span className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                  <FaArrowRight className="text-xs" />
                </span>
              </div>
              <div className="w-full">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-2">
                  Ayurveda • AYUSH
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-900 leading-tight mb-1.5">
                  {currentContent.ayushConsultation}
                </h4>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  {currentContent.ayushConsultationDesc}
                </p>
              </div>
            </button>
          </div>

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
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaArrowLeft,
  FaRedo,
  FaSpinner,
  FaStethoscope,
  FaCheck,
  FaArrowRight
} from 'react-icons/fa';
import { useInterview } from '../hooks/useInterview';
import { generateSummary } from '../../summary-generator/services/summaryApi';

import QuestionRenderer from '../components/QuestionRenderer';
import RetryNote from '../components/RetryNote';
import InterviewCompletion from '../components/InterviewCompletion';
import KioskNavbar from '../components/KioskNavbar';
import VoiceRecorder from '../components/VoiceRecorder';
import { getKioskStrings, getLocalizedPhaseMeta } from '../utils/kioskLocalization';

const PHASES = [
  { key: 'chief_complaint' },
  { key: 'hpi' },
  { key: 'extended_history' },
  { key: 'ros' },
  { key: 'ayush' }
];

export default function KioskInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const patientId = location.state?.patientId || localStorage.getItem("hmsPatientId") || user.patientId || null;

  const selectedLanguage = location.state?.language || localStorage.getItem('kiosk_language') || 'en';
  const assessmentType = location.state?.assessmentType || 'modern';

  const [textComplaint, setTextComplaint] = useState('');

  // Localized strings dictionary for the chosen language
  const strings = getKioskStrings(selectedLanguage);

  // Guard against duplicate summary generation (StrictMode / re-renders)
  const summaryGenerationStartedRef = useRef(new Set());
  const [summaryStatus, setSummaryStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  const {
    sessionId,
    currentQuestion,
    isLoading,
    isTranscribing,
    isAiSpeaking,
    error,
    interviewComplete,
    redFlagDetected,
    redFlagSeverity,
    alertTriggered,
    clinicalSummary,
    startInterview,
    submitAnswer,
    submitVoiceAnswer,
    stopSpeaking,
    retryLastAction,
    resetInterview
  } = useInterview(selectedLanguage);

  // Reset interview state on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      resetInterview();
    };
  }, [resetInterview, stopSpeaking]);

  // Handoff to summary module once interview is completed
  const triggerSummaryGeneration = useCallback((summaryData, pid, sid) => {
    if (!summaryData) {
      console.warn('[KIOSK] Cannot generate summary — missing clinical summary');
      return;
    }

    if (!pid) {
      console.error('[KIOSK] Cannot generate summary — missing patient ID');
      setSummaryStatus({
        loading: false,
        success: false,
        error: 'Patient record could not be identified. Please start the consultation from the Patient Dashboard.'
      });
      return;
    }

    const sessionKey = sid || `${pid}-${Date.now()}`;
    if (summaryGenerationStartedRef.current.has(sessionKey)) {
      console.log('[KIOSK] Summary generation already in progress/completed for session:', sessionKey);
      return;
    }
    summaryGenerationStartedRef.current.add(sessionKey);

    const runSave = async () => {
      setSummaryStatus({ loading: true, success: false, error: null });
      console.log('[KIOSK] Submitting completed consultation to summary generator for patientId:', pid);

      try {
        const result = await generateSummary({
          patientId: pid,
          interviewData: summaryData,
          documentTimeline: [],
          analyzedDocuments: []
        });
        console.log('[KIOSK] Summary generated and saved successfully:', result);

        // Cache summary on frontend for Doctor Dashboard / Review
        if (result) {
          try {
            localStorage.setItem(`hmsSummary:${pid}`, JSON.stringify(result));
          } catch (storageErr) {
            console.warn('[KIOSK] Could not cache summary to localStorage:', storageErr);
          }
        }

        setSummaryStatus({ loading: false, success: true, error: null });
      } catch (err) {
        console.error('[KIOSK] Summary generation failed:', err);
        // Remove from started set so patient/user can retry
        summaryGenerationStartedRef.current.delete(sessionKey);
        setSummaryStatus({ loading: false, success: false, error: err.message || 'Failed to save summary' });
      }
    };

    runSave();
  }, []);

  useEffect(() => {
    if (interviewComplete && clinicalSummary) {
      if (patientId) {
        const timer = setTimeout(() => {
          triggerSummaryGeneration(clinicalSummary, patientId, sessionId);
        }, 0);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setSummaryStatus({
            loading: false,
            success: false,
            error: 'Patient record could not be identified. Please start the consultation from the Patient Dashboard.'
          });
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [interviewComplete, clinicalSummary, patientId, sessionId, triggerSummaryGeneration]);

  const handleReturnHome = () => {
    stopSpeaking();
    resetInterview();
    navigate('/kiosk', { state: { language: selectedLanguage } });
  };

  const handleTouchSubmit = async (answer) => {
    stopSpeaking();
    await submitAnswer(answer, 'touch', selectedLanguage);
  };

  const handleTextComplaintSubmit = async () => {
    if (!textComplaint.trim() || isLoading || isTranscribing || isAiSpeaking) return;
    stopSpeaking();
    await startInterview(selectedLanguage, assessmentType, textComplaint.trim(), 'touch');
  };

  const currentSection = currentQuestion?.section || 'chief_complaint';
  const phaseMeta = getLocalizedPhaseMeta(currentSection, selectedLanguage);

  // Find index of current phase for dynamic progress indicator
  const activePhaseIndex = PHASES.findIndex(p => p.key === currentSection);

  // Completion screen (normal or urgent alert)
  if (interviewComplete || alertTriggered) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
          * { font-family: 'Nunito', sans-serif; }
          .font-display { font-family: 'Lora', serif; }
          .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        `}</style>

        {/* Hospital Branding Header */}
        <KioskNavbar topBarTag={strings.intakeDesk} />

        {/* Completion Main View */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
          <InterviewCompletion
            alertTriggered={alertTriggered}
            redFlagDetected={redFlagDetected}
            redFlagSeverity={redFlagSeverity}
            summaryStatus={summaryStatus}
            patientId={patientId}
            onRetrySummary={() => triggerSummaryGeneration(clinicalSummary, patientId, sessionId)}
            onReset={resetInterview}
            language={selectedLanguage}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .font-display { font-family: 'Lora', serif; }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        .card-hover { transition: all 0.2s ease-in-out; }
      `}</style>

      {/* Hospital Branding Header */}
      <KioskNavbar
        topBarTag={strings.consultationTitle}
        rightAction={
          <button
            type="button"
            onClick={handleReturnHome}
            className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold rounded-xl text-sm transition-all cursor-pointer"
          >
            <FaArrowLeft className="text-xs" />
            <span>{strings.exitConsultation}</span>
          </button>
        }
      />

      {/* Dynamic Phase Progression Tracker */}
      <div className="bg-white/80 border-b border-slate-200/80 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
          {PHASES.map((p, idx) => {
            const pMeta = getLocalizedPhaseMeta(p.key, selectedLanguage);
            const isCurrent = p.key === currentSection;
            const isCompleted = activePhaseIndex > idx;
            return (
              <div key={p.key} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${isCurrent
                    ? 'bg-teal-600 text-white shadow-sm'
                    : isCompleted
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-slate-100 text-slate-400'
                    }`}
                >
                  {isCompleted ? (
                    <FaCheck className="text-[10px]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                  <span>{pMeta.title}</span>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className={`w-4 sm:w-8 h-0.5 ${isCompleted ? 'bg-teal-300' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {/* Error Alert Box */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm font-semibold">
              <strong className="block text-rose-900 font-bold mb-0.5">{strings.connectionNotice}</strong>
              {error}
            </div>
            <button
              type="button"
              onClick={retryLastAction}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>{strings.retry}</span>
            </button>
          </div>
        )}

        {/* 1. Initial Complaint Screen (Before any question is generated) */}
        {!currentQuestion && (
          <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 sm:p-10 relative overflow-hidden transition-all duration-200">
            {/* Top Phase Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                  <FaStethoscope className="text-[11px]" />
                  <span>{phaseMeta.title}</span>
                </div>
                <div className="text-xs text-slate-400 font-semibold mt-1">
                  {phaseMeta.subtitle}
                </div>
              </div>
            </div>

            {/* In-Flight Submitting Banner */}
            {isLoading && (
              <div className="absolute inset-x-0 top-0 bg-teal-600/90 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 z-20 backdrop-blur-xs transition-all">
                <FaSpinner className="animate-spin text-xs" />
                <span>{strings.submittingComplaint}</span>
              </div>
            )}

            {/* Initial Complaint Prompt */}
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 leading-snug mb-2">
              {strings.tellUsHealthProblem}
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mb-6">
              {strings.describeInOwnWords}
            </p>

            {/* Option A: 🎤 Voice Input */}
            <div className="mb-6">
              <div className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>{strings.optionVoice}</span>
              </div>
              <VoiceRecorder
                onVoiceSubmit={(audioBlob) => submitVoiceAnswer(audioBlob, selectedLanguage)}
                isTranscribing={isTranscribing}
                isAiSpeaking={isAiSpeaking}
                disabled={isLoading || isTranscribing || isAiSpeaking}
                language={selectedLanguage}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {strings.orTypeBelow}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Option B: ⌨️ Text Input */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>{strings.optionText}</span>
              </div>
              <div className="relative">
                <textarea
                  value={textComplaint}
                  onChange={(e) => setTextComplaint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleTextComplaintSubmit();
                    }
                  }}
                  placeholder={strings.typePlaceholder}
                  disabled={isLoading || isTranscribing || isAiSpeaking}
                  rows={4}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-base sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all resize-none shadow-inner"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTextComplaintSubmit}
                  disabled={!textComplaint.trim() || isLoading || isTranscribing || isAiSpeaking}
                  className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base shadow-md shadow-teal-300/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
                >
                  <span>{strings.continueConsultation}</span>
                  <FaArrowRight className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Active AI Question Card (For all subsequent questions) */}
        {currentQuestion && (
          <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 sm:p-10 relative overflow-hidden transition-all duration-200">
            {/* Top Phase Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                  <FaStethoscope className="text-[11px]" />
                  <span>{phaseMeta.title}</span>
                </div>
                <div className="text-xs text-slate-400 font-semibold mt-1">
                  {phaseMeta.subtitle}
                </div>
              </div>

              {sessionId && (
                <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                  {strings.session}: {sessionId.slice(0, 8)}...
                </div>
              )}
            </div>

            {/* In-Flight Submitting Banner */}
            {isLoading && (
              <div className="absolute inset-x-0 top-0 bg-teal-600/90 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 z-20 backdrop-blur-xs transition-all">
                <FaSpinner className="animate-spin text-xs" />
                <span>{strings.recordingAnswer}</span>
              </div>
            )}

            {/* Speaking State Banner */}
            {isAiSpeaking && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold animate-pulse mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                <span>{strings.aiSpeaking}</span>
              </div>
            )}

            {/* Question Text (Generated in selected language by AI backend) */}
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 leading-snug mb-3">
              {currentQuestion.question}
            </h2>

            {/* Feedback / Retry Note */}
            {currentQuestion.note && (
              <RetryNote note={currentQuestion.note} />
            )}

            {/* Voice Capture Option - Available for every question */}
            <div className="mt-6 mb-4">
              <VoiceRecorder
                onVoiceSubmit={(audioBlob) => submitVoiceAnswer(audioBlob, selectedLanguage)}
                isTranscribing={isTranscribing}
                isAiSpeaking={isAiSpeaking}
                disabled={isLoading || isTranscribing || isAiSpeaking}
                language={selectedLanguage}
              />
            </div>

            {/* Subtle Divider: Voice or Touch */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {strings.orAnswerTouch}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Touch Question Option Input Widgets */}
            <div className="mt-2">
              <QuestionRenderer
                question={currentQuestion}
                onSubmit={handleTouchSubmit}
                disabled={isLoading || isTranscribing || isAiSpeaking}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

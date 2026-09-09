import { useState, useCallback, useRef, useEffect } from 'react';
import { startInterview as apiStartInterview, submitInterviewAnswer as apiSubmitInterviewAnswer, transcribeAudio as apiTranscribeAudio } from '../services/interviewApi';
import { convertBlobToWav } from '../utils/audioConverter';
import { triggerStaffAlert, buildAlertPayload } from '../services/alertTriggerApi';
import { playTextToSpeech, stopSpeech } from '../services/languageService';

export function useInterview(initialLanguage = 'en') {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || 'en');
  const [assessmentType, setAssessmentType] = useState('modern');
  const [ayushAssessments, setAyushAssessments] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState(null);
  
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [redFlagDetected, setRedFlagDetected] = useState(false);
  const [redFlagSeverity, setRedFlagSeverity] = useState(null);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState(null);

  const [lastAction, setLastAction] = useState(null);

  // Refs mirror the corresponding state values so async callbacks always
  // read the current value without stale-closure risk.
  const sessionIdRef = useRef(null);
  const selectedLanguageRef = useRef(initialLanguage || 'en');
  const assessmentTypeRef = useRef('modern');
  const ayushAssessmentsRef = useRef([]);
  const isLoadingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const lastInputModeRef = useRef('touch');

  // Task 5: Frontend dedup for alert trigger (optimization — backend Redis is authoritative)
  const emittedAlertsRef = useRef(new Set());

  // Keep refs in sync with state
  const syncSetSessionId = (v) => { sessionIdRef.current = v; setSessionId(v); };
  const syncSetSelectedLanguage = (v) => { selectedLanguageRef.current = v; setSelectedLanguage(v); };
  const syncSetAssessmentType = (v) => { assessmentTypeRef.current = v; setAssessmentType(v); };
  const syncSetAyushAssessments = (v) => { ayushAssessmentsRef.current = v; setAyushAssessments(v); };
  const syncSetIsLoading = (v) => { isLoadingRef.current = v; setIsLoading(v); };
  const syncSetIsTranscribing = (v) => { isTranscribingRef.current = v; setIsTranscribing(v); };
  const syncSetIsAiSpeaking = (v) => { isAiSpeakingRef.current = v; setIsAiSpeaking(v); };

  // Synchronize language when initialLanguage prop changes
  useEffect(() => {
    if (initialLanguage) {
      selectedLanguageRef.current = initialLanguage;
      setSelectedLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const resetInterview = useCallback(() => {
    stopSpeech();
    syncSetSessionId(null);
    setCurrentQuestion(null);
    syncSetIsLoading(false);
    syncSetIsTranscribing(false);
    syncSetIsAiSpeaking(false);
    lastInputModeRef.current = 'touch';
    setError(null);
    setLastAction(null);
    setInterviewComplete(false);
    setRedFlagDetected(false);
    setRedFlagSeverity(null);
    setAlertTriggered(false);
    setClinicalSummary(null);
    emittedAlertsRef.current.clear();
  }, []);

  const handleApiResponse = useCallback((data) => {
    console.log('[VOICE] handleApiResponse called, data:', JSON.stringify(data));
    console.log('[VOICE] next_question:', data.next_question);
    console.log('[VOICE] interview_complete:', data.interview_complete);
    console.log('[VOICE] red_flag_detected:', data.red_flag_detected);
    console.log('[VOICE] alert_triggered:', data.alert_triggered);

    if (data.session_id) {
      syncSetSessionId(data.session_id);
      console.log('[VOICE] session_id updated to:', data.session_id);
    }
    
    // If next_question is returned (including any retry note), update currentQuestion
    if (data.next_question) {
      setCurrentQuestion(data.next_question);
      console.log('[VOICE] currentQuestion updated to:', JSON.stringify(data.next_question));

      // Conversational Voice Mode: if patient answered via VOICE, auto-speak next question
      if (lastInputModeRef.current === 'voice' && data.next_question.question) {
        const questionToSpeak = data.next_question.question;
        const targetLang = selectedLanguageRef.current || 'en';
        console.log('[VOICE-CONVERSATIONAL] Auto-speaking question via TTS:', questionToSpeak, 'lang:', targetLang);
        
        syncSetIsAiSpeaking(true);
        playTextToSpeech(questionToSpeak, targetLang, {
          onStart: () => syncSetIsAiSpeaking(true),
          onEnd: () => syncSetIsAiSpeaking(false),
          onError: (err) => {
            console.warn('[VOICE-CONVERSATIONAL] TTS error (non-fatal):', err);
            syncSetIsAiSpeaking(false);
          }
        }).catch((err) => {
          console.warn('[VOICE-CONVERSATIONAL] TTS playback rejected:', err);
          syncSetIsAiSpeaking(false);
        });
      }
    } else if (data.interview_complete) {
      stopSpeech();
      syncSetIsAiSpeaking(false);
      setCurrentQuestion(null);
      console.log('[VOICE] Interview marked complete, currentQuestion cleared');
    }
    
    setInterviewComplete(!!data.interview_complete);
    setRedFlagDetected(!!data.red_flag_detected);
    setRedFlagSeverity(data.red_flag_severity || null);
    setAlertTriggered(!!data.alert_triggered);
    setClinicalSummary(data.clinical_summary || null);

    // ── Trigger staff alert when Module A detects a red flag ──
    if (data.red_flag_detected === true && data.alert_triggered === true) {
      const alertSessionId = data.session_id || sessionIdRef.current || 'unknown';
      const rawSeverity = (data.red_flag_severity || '').toLowerCase();
      const dedupeKey = `${alertSessionId}:${rawSeverity}`;

      // Frontend dedup: skip if already emitted for this session+severity
      if (!emittedAlertsRef.current.has(dedupeKey)) {
        emittedAlertsRef.current.add(dedupeKey);

        const alertPayload = buildAlertPayload(data);
        if (alertPayload) {
          // Fire-and-forget: do not block interview on alert delivery
          triggerStaffAlert(alertPayload).catch((err) => {
            console.error('[ALERT] Staff alert trigger failed (non-blocking):', err.message);
          });
        }
      } else {
        console.log('[ALERT] Frontend dedup: alert already emitted for', dedupeKey);
      }
    }
  }, []);

  const startInterview = useCallback(async (lang, type, initialComplaint = '', inputMode = 'touch') => {
    const targetLang = lang || selectedLanguageRef.current || 'en';
    const targetType = type || assessmentTypeRef.current || 'modern';

    stopSpeech();
    syncSetIsAiSpeaking(false);
    lastInputModeRef.current = inputMode;

    syncSetIsLoading(true);
    setError(null);
    syncSetSelectedLanguage(targetLang);
    syncSetAssessmentType(targetType);
    setLastAction(() => () => startInterview(targetLang, targetType, initialComplaint, inputMode));
    
    try {
      const data = await apiStartInterview(targetLang, targetType, initialComplaint, inputMode);
      handleApiResponse(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to start consultation. Please check your network connection.');
    } finally {
      syncSetIsLoading(false);
    }
  }, [handleApiResponse]);

  // submitAnswer uses refs for guards so it never silently returns due to stale closure
  const submitAnswer = useCallback(async (answer, inputMode = 'touch', overrideLang = null) => {
    const currentSessionId = sessionIdRef.current;
    const currentIsLoading = isLoadingRef.current;
    const currentLang = overrideLang || selectedLanguageRef.current || 'en';

    stopSpeech();
    syncSetIsAiSpeaking(false);
    lastInputModeRef.current = inputMode;

    console.log('[VOICE] submitAnswer called:', {
      answer,
      inputMode,
      sessionId: currentSessionId,
      isLoading: currentIsLoading,
      language: currentLang,
      assessmentType: assessmentTypeRef.current,
    });

    if (!currentSessionId) {
      console.error('[VOICE] submitAnswer BLOCKED — sessionId is null/empty');
      return;
    }
    if (currentIsLoading) {
      console.error('[VOICE] submitAnswer BLOCKED — isLoading is true (guard hit)');
      return;
    }

    syncSetIsLoading(true);
    setError(null);
    setLastAction(() => () => submitAnswer(answer, inputMode, currentLang));
    
    const payload = {
      sessionId: currentSessionId,
      language: currentLang,
      assessmentType: assessmentTypeRef.current,
      answer,
      inputMode: inputMode || 'touch',
      ayushAssessments: ayushAssessmentsRef.current,
    };
    console.log('[VOICE] Sending /interview request:', JSON.stringify(payload));

    try {
      const data = await apiSubmitInterviewAnswer(
        currentSessionId,
        currentLang,
        assessmentTypeRef.current,
        answer,
        inputMode || 'touch',
        ayushAssessmentsRef.current
      );
      console.log('[VOICE] /interview response received:', JSON.stringify(data));
      handleApiResponse(data);
      setError(null);
    } catch (err) {
      console.error('[VOICE] /interview request failed:', err);
      setError(err.message || 'Failed to submit answer. Please try again.');
    } finally {
      syncSetIsLoading(false);
      console.log('[VOICE] submitAnswer finished, isLoading reset to false');
    }
  }, [handleApiResponse]);

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      lastAction();
    } else if (!sessionIdRef.current) {
      startInterview(selectedLanguageRef.current, assessmentTypeRef.current);
    }
  }, [lastAction, startInterview]);

  const submitVoiceAnswer = useCallback(async (audioBlob, overrideLang = null) => {
    const currentSessionId = sessionIdRef.current;
    const currentIsLoading = isLoadingRef.current;
    const currentIsTranscribing = isTranscribingRef.current;
    const activeLang = overrideLang || selectedLanguageRef.current || 'en';

    stopSpeech();
    syncSetIsAiSpeaking(false);
    lastInputModeRef.current = 'voice';

    console.log('[VOICE] submitVoiceAnswer called:', {
      blobSize: audioBlob?.size,
      blobType: audioBlob?.type,
      sessionId: currentSessionId,
      isLoading: currentIsLoading,
      isTranscribing: currentIsTranscribing,
      language: activeLang
    });

    if (currentIsLoading) {
      console.error('[VOICE] submitVoiceAnswer BLOCKED — isLoading is true');
      return;
    }
    if (currentIsTranscribing) {
      console.error('[VOICE] submitVoiceAnswer BLOCKED — isTranscribing is true');
      return;
    }

    syncSetIsTranscribing(true);
    setError(null);
    
    let transcript = '';
    try {
      let wavBlob = audioBlob;
      if (!audioBlob.type || !audioBlob.type.includes('wav')) {
        console.log('[VOICE] Blob is not WAV, converting:', audioBlob.type);
        wavBlob = await convertBlobToWav(audioBlob);
        console.log('[VOICE] WAV conversion completed, size:', wavBlob.size);
      } else {
        console.log('[VOICE] Blob is already WAV, skipping conversion:', audioBlob.type, 'size:', audioBlob.size);
      }

      console.log('[VOICE] Sending audio to /transcribe, language:', activeLang, 'WAV size:', wavBlob.size);

      const transcribeData = await apiTranscribeAudio(wavBlob, activeLang, 'wav');
      console.log('[VOICE] /transcribe response:', JSON.stringify(transcribeData));
      console.log('[VOICE] transcribeData.success:', transcribeData.success);
      console.log('[VOICE] transcribeData.transcript:', transcribeData.transcript);

      if (transcribeData.success && transcribeData.transcript && transcribeData.transcript.trim().length > 0) {
        transcript = transcribeData.transcript.trim();
        console.log('[VOICE] Transcript received:', transcript);
        console.log('[VOICE] Transcript length:', transcript.length);
      } else {
        const msg = transcribeData.message || "We couldn't hear your answer. Please tap and try speaking again.";
        console.warn('[VOICE] Transcription returned empty or failed:', transcribeData);
        setError(msg);
        syncSetIsTranscribing(false);
        return;
      }
    } catch (err) {
      console.error('[VOICE] Transcription error:', err);
      setError(err.message || 'Transcription failed. Please try again or use the touch options.');
      syncSetIsTranscribing(false);
      return;
    }
    
    syncSetIsTranscribing(false);
    console.log('[VOICE] isTranscribing set to false, proceeding to submit...');
    console.log('[VOICE] Transcript:', transcript, 'inputMode: voice', 'language:', activeLang);
    console.log('[VOICE] sessionId at this point:', sessionIdRef.current);

    if (!sessionIdRef.current) {
      console.log('[VOICE] Submitting initial voice complaint to startInterview with language:', activeLang);
      await startInterview(activeLang, assessmentTypeRef.current, transcript, 'voice');
    } else {
      console.log('[VOICE] Calling submitAnswer() with transcript:', transcript, 'inputMode: voice', 'language:', activeLang);
      await submitAnswer(transcript, 'voice', activeLang);
    }
    console.log('[VOICE] submitVoiceAnswer() completed');
  }, [startInterview, submitAnswer]);

  const speakQuestion = useCallback((text, lang) => {
    const targetText = text || currentQuestion?.question;
    if (!targetText) return;
    const targetLang = lang || selectedLanguageRef.current || 'en';
    syncSetIsAiSpeaking(true);
    playTextToSpeech(targetText, targetLang, {
      onStart: () => syncSetIsAiSpeaking(true),
      onEnd: () => syncSetIsAiSpeaking(false),
      onError: () => syncSetIsAiSpeaking(false)
    }).catch(() => syncSetIsAiSpeaking(false));
  }, [currentQuestion]);

  const stopSpeaking = useCallback(() => {
    stopSpeech();
    syncSetIsAiSpeaking(false);
  }, []);

  return {
    sessionId,
    currentQuestion,
    selectedLanguage,
    assessmentType,
    ayushAssessments,
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
    speakQuestion,
    stopSpeaking,
    resetInterview,
    retryLastAction,
    setAyushAssessments: syncSetAyushAssessments,
  };
}

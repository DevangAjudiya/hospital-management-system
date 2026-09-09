import { useState, useRef, useCallback, useEffect } from 'react';
import { convertBlobToWav } from '../utils/audioConverter';
import { getKioskStrings } from '../utils/kioskLocalization';

const MIME_CANDIDATES = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', extension: 'mp4' },
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
  { mimeType: 'audio/ogg', extension: 'ogg' }
];

export function getSupportedMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return null;
  }
  for (const candidate of MIME_CANDIDATES) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return null;
}

export function useVoiceRecorder({ onRecordingComplete, isTranscribing, language = 'en' }) {
  // recorderState: 'idle' | 'requesting' | 'recording' | 'processing' | 'error'
  const [recorderState, setRecorderState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [analyser, setAnalyser] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const chunksRef = useRef([]);
  const selectedMimeRef = useRef(null);

  const localized = getKioskStrings(language);

  // Safely stop tracks and close AudioContext
  const cleanupMediaResources = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    setAnalyser(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMediaResources();
    };
  }, [cleanupMediaResources]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);

    // 1. Verify MediaRecorder & getUserMedia support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecorderState('error');
      setErrorMessage(localized.micNotSupported);
      return;
    }

    const supportedMime = getSupportedMimeType();
    if (!supportedMime) {
      setRecorderState('error');
      setErrorMessage(localized.voiceNotSupported);
      return;
    }
    selectedMimeRef.current = supportedMime;

    // 2. Request microphone permission
    setRecorderState('requesting');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
    } catch (err) {
      console.warn('Microphone permission/access error:', err);
      cleanupMediaResources();
      setRecorderState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(localized.micDenied);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage(localized.micUnavailable);
      } else {
        setErrorMessage(localized.micConnectError);
      }
      return;
    }

    // 3. Initialize Web Audio API AnalyserNode for waveform feedback
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;
        analyserNode.smoothingTimeConstant = 0.8;
        source.connect(analyserNode);
        setAnalyser(analyserNode);
      }
    } catch (audioErr) {
      console.warn('Web Audio API Analyser initialization skipped:', audioErr);
    }

    // 4. Initialize MediaRecorder
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMime.mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedMime = selectedMimeRef.current?.mimeType || 'audio/webm';
        const rawBlob = new Blob(chunksRef.current, { type: recordedMime });
        
        // Immediate cleanup of hardware mic tracks
        cleanupMediaResources();

        if (rawBlob.size === 0) {
          setRecorderState('error');
          setErrorMessage(localized.noSpeechDetected);
          return;
        }

        setRecorderState('processing');
        try {
          // Decode browser-recorded audio and encode to valid 16kHz mono PCM WAV
          const wavBlob = await convertBlobToWav(rawBlob);
          if (typeof onRecordingComplete === 'function') {
            onRecordingComplete(wavBlob, 'wav');
          }
          // Reset to idle — the parent (isTranscribing) will drive the processing
          // overlay while the API call is in flight; the recorder itself is done.
          setRecorderState('idle');
        } catch (convErr) {
          console.error('Audio conversion error:', convErr);
          setRecorderState('error');
          setErrorMessage(localized.voiceProcessingFailed);
        }
      };

      mediaRecorder.start(100);
      setRecorderState('recording');
    } catch (recErr) {
      console.error('MediaRecorder initialization failed:', recErr);
      cleanupMediaResources();
      setRecorderState('error');
      setErrorMessage(localized.micConnectError);
    }
  }, [cleanupMediaResources, onRecordingComplete, localized]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }
  }, []);

  const resetRecorder = useCallback(() => {
    cleanupMediaResources();
    setErrorMessage(null);
    setRecorderState('idle');
  }, [cleanupMediaResources]);

  const effectiveState = isTranscribing ? 'processing' : recorderState;

  return {
    recorderState: effectiveState,
    errorMessage,
    analyser,
    startRecording,
    stopRecording,
    resetRecorder
  };
}

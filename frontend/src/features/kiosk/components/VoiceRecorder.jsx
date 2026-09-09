import React, { useEffect, useRef } from 'react';
import {
  FaMicrophone,
  FaStop,
  FaSpinner,
  FaRedo,
  FaExclamationCircle
} from 'react-icons/fa';
import { FaVolumeHigh } from 'react-icons/fa6';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { getKioskStrings } from '../utils/kioskLocalization';

export default function VoiceRecorder({
  onVoiceSubmit,
  isTranscribing = false,
  isAiSpeaking = false,
  disabled = false,
  language = 'en'
}) {
  const {
    recorderState,
    errorMessage,
    analyser,
    startRecording,
    stopRecording,
    resetRecorder
  } = useVoiceRecorder({
    onRecordingComplete: onVoiceSubmit,
    isTranscribing,
    language
  });

  const strings = getKioskStrings(language);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Waveform visualization loop
  useEffect(() => {
    if (recorderState !== 'recording') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 32;
    let dataArray = new Uint8Array(bufferLength);
    if (analyser) {
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const renderWaveform = () => {
      animationFrameRef.current = requestAnimationFrame(renderWaveform);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let values = [];
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        // Take first 24 active frequency bins
        const sliceCount = Math.min(24, bufferLength);
        for (let i = 0; i < sliceCount; i++) {
          values.push(dataArray[i]);
        }
      } else {
        // Fallback animated wave pattern if AnalyserNode was not supported
        const t = performance.now() * 0.005;
        for (let i = 0; i < 24; i++) {
          const val = Math.sin(t + i * 0.3) * 40 + 50;
          values.push(Math.max(10, val));
        }
      }

      const numBars = values.length;
      const totalSpacing = (numBars - 1) * 4;
      const barWidth = Math.max(3, (width - totalSpacing) / numBars);

      for (let i = 0; i < numBars; i++) {
        // Normalize value (0 to 255) to height (min 6px, max height - 8px)
        const raw = values[i] || 0;
        const normalized = Math.min(1, Math.max(0.08, raw / 255));
        const barHeight = Math.max(6, normalized * (height - 12));
        const x = i * (barWidth + 4);
        const y = (height - barHeight) / 2;

        // Gradient for bars matching hospital teal design
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#14b8a6');
        gradient.addColorStop(0.5, '#0d9488');
        gradient.addColorStop(1, '#0f766e');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Rounded bar caps
        const radius = Math.min(barWidth / 2, 3);
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }
    };

    renderWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [recorderState, analyser]);

  const handleMainAction = () => {
    if (disabled || isAiSpeaking) return;

    if (recorderState === 'idle') {
      startRecording();
    } else if (recorderState === 'recording') {
      stopRecording();
    } else if (recorderState === 'error') {
      resetRecorder();
      startRecording();
    }
  };

  const isInteractionDisabled = disabled || isAiSpeaking || recorderState === 'requesting' || recorderState === 'processing';

  return (
    <div className="w-full bg-gradient-to-r from-teal-50/60 via-mint/40 to-slate-50 border-2 border-teal-100 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Top Header / Context Label */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isAiSpeaking ? 'bg-teal-500 animate-ping' : 'bg-teal-500 animate-pulse'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
            {isAiSpeaking ? strings.aiSpeaking : strings.voiceAnswerOption}
          </span>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {isAiSpeaking
            ? strings.aiSpeakingHint
            : recorderState === 'recording'
            ? strings.speakingHint
            : recorderState === 'processing'
            ? strings.sendingToEngine
            : strings.touchOrVoice}
        </span>
      </div>

      {/* Main Interactive Control Area */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Large Touch Button */}
        <button
          type="button"
          onClick={handleMainAction}
          disabled={isInteractionDisabled}
          aria-label={
            isAiSpeaking
              ? strings.aiSpeaking
              : recorderState === 'recording'
              ? 'Stop Recording'
              : recorderState === 'processing'
              ? 'Processing Voice'
              : recorderState === 'error'
              ? strings.tryAgain
              : strings.tapToSpeak
          }
          className={`relative group flex items-center justify-center gap-3 sm:gap-4 px-6 py-4 sm:py-4.5 rounded-2xl font-bold text-base sm:text-lg transition-all duration-200 cursor-pointer select-none min-h-[72px] sm:min-h-[76px] ${
            isAiSpeaking
              ? 'bg-teal-700/90 text-white shadow-md cursor-wait'
              : recorderState === 'recording'
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-300/50 ring-4 ring-rose-200 active:scale-[0.98]'
              : recorderState === 'processing'
              ? 'bg-teal-700 text-white shadow-md opacity-90 cursor-wait'
              : recorderState === 'requesting'
              ? 'bg-amber-500 text-white shadow-md cursor-wait'
              : recorderState === 'error'
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md active:scale-[0.98]'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-300/40 hover:scale-[1.01] active:scale-[0.98]'
          } ${disabled && !isAiSpeaking ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
        >
          {/* State Icon */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-transform ${
              isAiSpeaking
                ? 'bg-white/20 text-white animate-bounce'
                : recorderState === 'recording'
                ? 'bg-white/20 text-white animate-pulse'
                : recorderState === 'processing' || recorderState === 'requesting'
                ? 'bg-white/20 text-white'
                : 'bg-white/20 text-white group-hover:scale-110'
            }`}
          >
            {isAiSpeaking ? (
              <FaVolumeHigh className="text-lg" />
            ) : recorderState === 'recording' ? (
              <FaStop className="text-base" />
            ) : recorderState === 'processing' || recorderState === 'requesting' ? (
              <FaSpinner className="animate-spin text-lg" />
            ) : recorderState === 'error' ? (
              <FaRedo className="text-base" />
            ) : (
              <FaMicrophone className="text-lg" />
            )}
          </div>

          {/* State Labels */}
          <div className="text-left flex flex-col justify-center">
            <span className="leading-tight font-extrabold text-base sm:text-lg">
              {isAiSpeaking && strings.aiSpeaking}
              {!isAiSpeaking && recorderState === 'idle' && strings.tapToSpeak}
              {!isAiSpeaking && recorderState === 'requesting' && strings.allowMic}
              {!isAiSpeaking && recorderState === 'recording' && strings.listening}
              {!isAiSpeaking && recorderState === 'processing' && strings.processing}
              {!isAiSpeaking && recorderState === 'error' && strings.tryAgain}
            </span>
            <span className="text-xs font-normal opacity-90 leading-tight mt-0.5">
              {isAiSpeaking && strings.aiSpeakingHint}
              {!isAiSpeaking && recorderState === 'idle' && strings.tapToSpeakSub}
              {!isAiSpeaking && recorderState === 'requesting' && strings.allowMicSub}
              {!isAiSpeaking && recorderState === 'recording' && strings.listeningSub}
              {!isAiSpeaking && recorderState === 'processing' && strings.processingSub}
              {!isAiSpeaking && recorderState === 'error' && strings.tryAgainSub}
            </span>
          </div>
        </button>

        {/* Live Audio Activity & Waveform Canvas Feedback */}
        {recorderState === 'recording' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/90 border border-teal-200/80 rounded-2xl px-4 py-3 shadow-inner">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                {strings.liveWaveform}
              </span>
            </div>
            <canvas
              ref={canvasRef}
              width={260}
              height={44}
              className="w-full max-w-[280px] h-[44px] block"
            />
          </div>
        )}

        {/* Idle Helper Hint when not recording */}
        {recorderState === 'idle' && (
          <div className="hidden sm:flex flex-1 flex-col justify-center px-4 py-2 text-slate-500 text-xs leading-relaxed border-l border-teal-100/80">
            <div className="font-semibold text-slate-700 mb-0.5">
              {strings.handsFreeTitle}
            </div>
            {strings.handsFreeDesc}
          </div>
        )}

        {/* Processing State Indicator */}
        {recorderState === 'processing' && (
          <div className="flex-1 flex items-center justify-center gap-3 bg-white/80 border border-teal-100 rounded-2xl p-4">
            <FaSpinner className="animate-spin text-teal-600 text-xl" />
            <div className="text-xs text-slate-600 font-semibold">
              {strings.processingBanner}
            </div>
          </div>
        )}
      </div>

      {/* Patient-Friendly Error Notification Banner */}
      {errorMessage && (
        <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
          <FaExclamationCircle className="text-amber-600 text-base flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block text-amber-950">{strings.audioNotice}</strong>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              resetRecorder();
              startRecording();
            }}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          >
            <FaRedo className="text-[10px]" />
            <span>{strings.retry}</span>
          </button>
        </div>
      )}
    </div>
  );
}

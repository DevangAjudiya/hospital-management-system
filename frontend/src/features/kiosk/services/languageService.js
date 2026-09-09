/**
 * Language Service for MultiSpecialist Kiosk
 * 
 * Defines the supported languages and their configuration matching the
 * IndicTrans2 translation service (ai4bharat/indictrans2-en-indic-dist-200M)
 * and gTTS speech engine.
 */

const TTS_BASE_URL = import.meta.env.VITE_TTS_API_BASE_URL || 'http://localhost:5001';

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    indicCode: 'eng_Latn',
    speechCode: 'en-IN',
    ttsSupported: true
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    indicCode: 'hin_Deva',
    speechCode: 'hi-IN',
    ttsSupported: true
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    indicCode: 'guj_Gujr',
    speechCode: 'gu-IN',
    ttsSupported: true
  }
];

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

export function getLanguageByCode(code = 'en') {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const normalized = code.split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.find(l => l.code === normalized) || SUPPORTED_LANGUAGES[0];
}

export function isLanguageSupported(code) {
  if (!code) return false;
  const normalized = code.split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.some(l => l.code === normalized);
}

// Keep track of active audio elements / speech synthesis for cancellation
let currentAudioInstance = null;

/**
 * Stop any active TTS or speech synthesis playback
 */
export function stopSpeech() {
  if (currentAudioInstance) {
    try {
      currentAudioInstance.pause();
      currentAudioInstance.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudioInstance = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Plays text-to-speech using the Python TTS endpoint (/tts) with fallback to browser SpeechSynthesis.
 * 
 * @param {string} text The text to speak
 * @param {string} langCode The language code ('en', 'hi', 'gu')
 * @param {object} callbacks Optional callbacks: onStart, onEnd, onError
 */
export async function playTextToSpeech(text, langCode = 'en', callbacks = {}) {
  stopSpeech();

  const langConfig = getLanguageByCode(langCode);
  const { onStart, onEnd } = callbacks;

  // 1. Try Python gTTS FastAPI service at /tts
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${TTS_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        lang: langConfig.code
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      currentAudioInstance = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioInstance = null;
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioInstance = null;
        fallbackToBrowserSpeech(text, langConfig, callbacks);
      };

      await audio.play();
      return;
    }
  } catch (err) {
    console.warn('[TTS] Python TTS service unavailable, falling back to browser SpeechSynthesis:', err.message);
  }

  // 2. Fallback to Web Speech API
  fallbackToBrowserSpeech(text, langConfig, callbacks);
}

function fallbackToBrowserSpeech(text, langConfig, callbacks = {}) {
  const { onStart, onEnd, onError } = callbacks;

  if (!('speechSynthesis' in window)) {
    if (onError) onError(new Error('Audio playback not supported in this browser'));
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const targetSpeechCode = langConfig.speechCode.toLowerCase();
  const targetPrefix = langConfig.code.toLowerCase();

  // Find matching voice
  const voice =
    voices.find(v => v.lang.toLowerCase() === targetSpeechCode) ||
    voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix)) ||
    null;

  if (!voice && langConfig.code !== 'en') {
    const errMsg = `Audio instructions for ${langConfig.nativeName} are not available on this device.`;
    if (onError) onError(new Error(errMsg));
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = langConfig.speechCode;
  utterance.rate = 0.85;
  utterance.pitch = 1;

  utterance.onstart = () => {
    if (onStart) onStart();
  };
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = (evt) => {
    if (onError) onError(evt);
  };

  window.speechSynthesis.speak(utterance);
}

// Text-to-Speech Utility - Supports Web Speech API, OpenAI TTS, and custom audio

export type TTSProvider = 'browser' | 'openai' | 'custom';

export interface TTSSettings {
  provider: TTSProvider;
  browserVoice?: string;
  browserRate?: number;
  browserPitch?: number;
  openaiApiKey?: string;
  openaiVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  openaiModel?: 'tts-1' | 'tts-1-hd';
}

export interface BrowserVoice {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
}

// Default TTS settings
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'browser',
  browserRate: 1.0,
  browserPitch: 1.0,
  openaiVoice: 'nova',
  openaiModel: 'tts-1',
};

// Get available browser voices
export function getBrowserVoices(): Promise<BrowserVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices.map(v => ({
        name: v.name,
        lang: v.lang,
        default: v.default,
        localService: v.localService,
      })));
      return;
    }

    // Voices might not be loaded yet
    speechSynthesis.onvoiceschanged = () => {
      const loadedVoices = speechSynthesis.getVoices();
      resolve(loadedVoices.map(v => ({
        name: v.name,
        lang: v.lang,
        default: v.default,
        localService: v.localService,
      })));
    };

    // Timeout fallback
    setTimeout(() => {
      resolve(speechSynthesis.getVoices().map(v => ({
        name: v.name,
        lang: v.lang,
        default: v.default,
        localService: v.localService,
      })));
    }, 1000);
  });
}

// Speak using browser's Web Speech API
export function speakWithBrowser(
  text: string,
  settings: Partial<TTSSettings> = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.browserRate ?? 1.0;
    utterance.pitch = settings.browserPitch ?? 1.0;

    // Set voice if specified
    if (settings.browserVoice) {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === settings.browserVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(event.error));

    speechSynthesis.speak(utterance);
  });
}

// Speak using OpenAI TTS API
export async function speakWithOpenAI(
  text: string,
  settings: Partial<TTSSettings> = {}
): Promise<void> {
  const apiKey = settings.openaiApiKey;
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.openaiModel || 'tts-1',
        input: text,
        voice: settings.openaiVoice || 'nova',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Failed to play audio'));
      };
      audio.play().catch(reject);
    });
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    throw error;
  }
}

// Play custom audio recording (base64)
export function playCustomAudio(audioData: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioData);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Failed to play custom audio'));
    audio.play().catch(reject);
  });
}

// Main speak function - chooses provider based on settings
export async function speak(
  text: string,
  settings: Partial<TTSSettings> = {},
  customAudio?: string
): Promise<void> {
  // If custom audio is provided, use it
  if (customAudio) {
    try {
      await playCustomAudio(customAudio);
      return;
    } catch (error) {
      console.warn('Custom audio playback failed, falling back to TTS:', error);
    }
  }

  const provider = settings.provider || 'browser';

  switch (provider) {
    case 'openai':
      if (settings.openaiApiKey) {
        try {
          await speakWithOpenAI(text, settings);
          return;
        } catch (error) {
          console.warn('OpenAI TTS failed, falling back to browser:', error);
        }
      }
      // Fall through to browser if no API key or error
      await speakWithBrowser(text, settings);
      break;

    case 'browser':
    default:
      await speakWithBrowser(text, settings);
      break;
  }
}

// Stop any ongoing speech
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

// Check if speech synthesis is speaking
export function isSpeaking(): boolean {
  if ('speechSynthesis' in window) {
    return speechSynthesis.speaking;
  }
  return false;
}

// Generate reminder speech text
export function generateReminderSpeech(title: string, why?: string): string {
  let text = `Hey! This is your future self calling. `;
  text += `It's time for: ${title}. `;

  if (why) {
    text += `Remember why this matters: ${why}. `;
  }

  text += `You've got this! Take action now.`;

  return text;
}

// Generate panic button speech text
export function generatePanicSpeech(): string {
  return `Hey, I know this is hard right now. But remember, you are stronger than this temptation.
  Take a deep breath. Think about why you started this journey.
  You have the power to choose differently. Every moment is a new chance.
  You've overcome challenges before, and you'll overcome this one too.
  I believe in you. Stay strong.`;
}

// Preview voice with sample text
export async function previewVoice(settings: Partial<TTSSettings>): Promise<void> {
  const sampleText = "Hello! This is how your future self will sound when reminding you.";
  await speak(sampleText, settings);
}

// Get TTS settings from localStorage
export function getTTSSettings(): TTSSettings {
  try {
    const saved = localStorage.getItem('yrfrsf-tts-settings');
    if (saved) {
      return { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error loading TTS settings:', error);
  }
  return DEFAULT_TTS_SETTINGS;
}

// Save TTS settings to localStorage
export function saveTTSSettings(settings: Partial<TTSSettings>): void {
  try {
    const current = getTTSSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('yrfrsf-tts-settings', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving TTS settings:', error);
  }
}

// OpenAI voice options with descriptions
export const OPENAI_VOICES = [
  { id: 'alloy' as const, name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo' as const, name: 'Echo', description: 'Warm and conversational' },
  { id: 'fable' as const, name: 'Fable', description: 'Expressive and dramatic' },
  { id: 'onyx' as const, name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova' as const, name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer' as const, name: 'Shimmer', description: 'Soft and calming' },
];

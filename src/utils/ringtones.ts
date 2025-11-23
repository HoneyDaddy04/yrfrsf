/**
 * Ringtone Generation Utilities
 *
 * Multiple calming ringtone options for the reminder app
 */

export type RingtoneType = 'chimes' | 'bells' | 'marimba' | 'piano' | 'harp';

export interface Ringtone {
  id: RingtoneType;
  name: string;
  description: string;
}

export const AVAILABLE_RINGTONES: Ringtone[] = [
  {
    id: 'chimes',
    name: 'Calm Chimes',
    description: 'Soft, harmonious wind chimes (Default)',
  },
  {
    id: 'bells',
    name: 'Gentle Bells',
    description: 'Pleasant bell tones',
  },
  {
    id: 'marimba',
    name: 'Soft Marimba',
    description: 'Warm wooden tones',
  },
  {
    id: 'piano',
    name: 'Piano Notes',
    description: 'Peaceful piano melody',
  },
  {
    id: 'harp',
    name: 'Harp Arpeggio',
    description: 'Angelic harp sounds',
  },
];

/**
 * Generate a calming chimes ringtone (Default)
 */
function generateChimes(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 1.5;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // A major chord: 440Hz (A4) + 554Hz (C#5) + 659Hz (E5)
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const fundamental = Math.sin(2 * Math.PI * 440 * t);
    const third = Math.sin(2 * Math.PI * 554 * t) * 0.6;
    const fifth = Math.sin(2 * Math.PI * 659 * t) * 0.4;

    const fadeIn = Math.min(t * 4, 1);
    const fadeOut = Math.max(1 - (t - duration + 0.3) / 0.3, 0);
    const envelope = fadeIn * fadeOut * 0.15;

    data[i] = (fundamental + third + fifth) * envelope;
  }

  return buffer;
}

/**
 * Generate gentle bells ringtone
 */
function generateBells(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 1.5;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // Bell-like tones: 523Hz (C5) + 784Hz (G5) - Perfect fifth
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const bell1 = Math.sin(2 * Math.PI * 523 * t);
    const bell2 = Math.sin(2 * Math.PI * 784 * t) * 0.7;
    const overtone = Math.sin(2 * Math.PI * 1046 * t) * 0.3;

    const fadeIn = Math.min(t * 5, 1);
    const fadeOut = Math.exp(-t * 1.5); // Exponential decay like real bells
    const envelope = fadeIn * fadeOut * 0.12;

    data[i] = (bell1 + bell2 + overtone) * envelope;
  }

  return buffer;
}

/**
 * Generate soft marimba ringtone
 */
function generateMarimba(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 1.2;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // Marimba: Lower, warmer tones with harmonics
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const fundamental = Math.sin(2 * Math.PI * 330 * t); // E4
    const harmonic2 = Math.sin(2 * Math.PI * 660 * t) * 0.5;
    const harmonic3 = Math.sin(2 * Math.PI * 990 * t) * 0.25;

    const fadeIn = Math.min(t * 10, 1);
    const fadeOut = Math.exp(-t * 2.5); // Quick decay like marimba
    const envelope = fadeIn * fadeOut * 0.18;

    data[i] = (fundamental + harmonic2 + harmonic3) * envelope;
  }

  return buffer;
}

/**
 * Generate piano notes ringtone
 */
function generatePiano(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 1.5;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // Piano: C major arpeggio (C4-E4-G4)
  const notes = [
    { freq: 261.63, start: 0, duration: 0.8 },      // C4
    { freq: 329.63, start: 0.3, duration: 0.8 },    // E4
    { freq: 392.00, start: 0.6, duration: 0.9 },    // G4
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.duration) {
        const noteTime = t - note.start;
        const fundamental = Math.sin(2 * Math.PI * note.freq * noteTime);
        const harmonic2 = Math.sin(2 * Math.PI * note.freq * 2 * noteTime) * 0.3;
        const harmonic3 = Math.sin(2 * Math.PI * note.freq * 3 * noteTime) * 0.15;

        const fadeIn = Math.min(noteTime * 20, 1);
        const fadeOut = Math.exp(-noteTime * 3);
        const envelope = fadeIn * fadeOut * 0.12;

        sample += (fundamental + harmonic2 + harmonic3) * envelope;
      }
    }

    data[i] = sample;
  }

  return buffer;
}

/**
 * Generate harp arpeggio ringtone
 */
function generateHarp(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 1.8;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(1, numFrames, sampleRate);
  const data = buffer.getChannelData(0);

  // Harp: Ascending arpeggio in D major
  const notes = [
    { freq: 293.66, start: 0,    duration: 1.5 },   // D4
    { freq: 369.99, start: 0.15, duration: 1.5 },   // F#4
    { freq: 440.00, start: 0.3,  duration: 1.5 },   // A4
    { freq: 587.33, start: 0.45, duration: 1.5 },   // D5
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.duration) {
        const noteTime = t - note.start;
        const fundamental = Math.sin(2 * Math.PI * note.freq * noteTime);
        const harmonic = Math.sin(2 * Math.PI * note.freq * 2 * noteTime) * 0.4;

        const fadeIn = Math.min(noteTime * 15, 1);
        const fadeOut = Math.exp(-noteTime * 1.2); // Slow decay like harp
        const envelope = fadeIn * fadeOut * 0.1;

        sample += (fundamental + harmonic) * envelope;
      }
    }

    data[i] = sample;
  }

  return buffer;
}

/**
 * Generate ringtone buffer based on selected type
 */
export function generateRingtone(audioContext: AudioContext, type: RingtoneType): AudioBuffer {
  switch (type) {
    case 'chimes':
      return generateChimes(audioContext);
    case 'bells':
      return generateBells(audioContext);
    case 'marimba':
      return generateMarimba(audioContext);
    case 'piano':
      return generatePiano(audioContext);
    case 'harp':
      return generateHarp(audioContext);
    default:
      return generateChimes(audioContext);
  }
}

/**
 * Get selected ringtone from settings (or default)
 */
export function getSelectedRingtone(): RingtoneType {
  try {
    const settingsStr = localStorage.getItem('aiReminderSettings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      return settings.ringtone || 'chimes';
    }
  } catch (error) {
    console.error('Error loading ringtone setting:', error);
  }
  return 'chimes';
}

/**
 * Save selected ringtone to settings
 */
export function saveRingtone(ringtone: RingtoneType): void {
  try {
    const settingsStr = localStorage.getItem('aiReminderSettings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    settings.ringtone = ringtone;
    localStorage.setItem('aiReminderSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving ringtone setting:', error);
  }
}

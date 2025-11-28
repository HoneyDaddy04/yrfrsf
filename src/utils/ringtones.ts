/**
 * Ringtone Generation Utilities
 *
 * Modern ringtone options inspired by iOS, Android, Samsung, and Pixel devices
 */

export type RingtoneType = 'reflection' | 'ripple' | 'beacon' | 'aurora' | 'prism' | 'cascade' | 'pulse' | 'zen';

export interface Ringtone {
  id: RingtoneType;
  name: string;
  description: string;
}

export const AVAILABLE_RINGTONES: Ringtone[] = [
  {
    id: 'reflection',
    name: 'Reflection',
    description: 'Calm, modern tones (Default)',
  },
  {
    id: 'ripple',
    name: 'Ripple',
    description: 'Gentle wave-like melody',
  },
  {
    id: 'beacon',
    name: 'Beacon',
    description: 'Clear, attention-grabbing signal',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Soft, ambient glow tones',
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'Crystalline modern sound',
  },
  {
    id: 'cascade',
    name: 'Cascade',
    description: 'Flowing, soothing melody',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'Rhythmic, energizing beat',
  },
  {
    id: 'zen',
    name: 'Zen',
    description: 'Minimal, peaceful meditation tone',
  },
];

/**
 * Generate Reflection - modern iPhone-inspired ringtone
 */
function generateReflection(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.5;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  // Modern tri-tone pattern like iPhone
  const notes = [
    { freq: 880, start: 0, dur: 0.3 },      // A5
    { freq: 1174.66, start: 0.25, dur: 0.3 }, // D6
    { freq: 1318.51, start: 0.5, dur: 0.5 },  // E6
    { freq: 880, start: 1.2, dur: 0.3 },
    { freq: 1174.66, start: 1.45, dur: 0.3 },
    { freq: 1318.51, start: 1.7, dur: 0.5 },
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const noteT = t - note.start;
        const env = Math.sin(Math.PI * noteT / note.dur) * 0.15;
        sample += Math.sin(2 * Math.PI * note.freq * noteT) * env;
        sample += Math.sin(2 * Math.PI * note.freq * 2 * noteT) * env * 0.3;
      }
    }

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate Ripple - Samsung-inspired water drop sound
 */
function generateRipple(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.0;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  const dropTimes = [0, 0.4, 0.7, 1.2, 1.5];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const dropStart of dropTimes) {
      if (t >= dropStart && t < dropStart + 0.4) {
        const dt = t - dropStart;
        // Descending frequency for water drop effect
        const freq = 2000 * Math.exp(-dt * 8);
        const env = Math.exp(-dt * 6) * 0.12;
        sample += Math.sin(2 * Math.PI * freq * dt) * env;
      }
    }

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate Beacon - Pixel-inspired clear alert
 */
function generateBeacon(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.0;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  const beeps = [
    { start: 0, freq: 1046.50 },    // C6
    { start: 0.15, freq: 1318.51 }, // E6
    { start: 0.3, freq: 1567.98 },  // G6
    { start: 0.7, freq: 1046.50 },
    { start: 0.85, freq: 1318.51 },
    { start: 1.0, freq: 1567.98 },
    { start: 1.4, freq: 2093.00 },  // C7
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const beep of beeps) {
      if (t >= beep.start && t < beep.start + 0.12) {
        const bt = t - beep.start;
        const env = Math.sin(Math.PI * bt / 0.12) * 0.12;
        sample += Math.sin(2 * Math.PI * beep.freq * bt) * env;
      }
    }

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate Aurora - ambient, ethereal tones
 */
function generateAurora(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 3.0;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;

    // Slow fade in/out
    const env = Math.sin(Math.PI * t / duration) * 0.1;

    // Layered ambient frequencies
    const base = Math.sin(2 * Math.PI * 220 * t);
    const fifth = Math.sin(2 * Math.PI * 330 * t) * 0.7;
    const octave = Math.sin(2 * Math.PI * 440 * t) * 0.5;
    const shimmer = Math.sin(2 * Math.PI * 880 * t + Math.sin(t * 3)) * 0.3;

    const sample = (base + fifth + octave + shimmer) * env;

    // Slight stereo variation
    leftData[i] = sample;
    rightData[i] = sample * 0.95 + Math.sin(2 * Math.PI * 445 * t) * env * 0.05;
  }

  return buffer;
}

/**
 * Generate Prism - crystalline, modern tones
 */
function generatePrism(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.0;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  // Arpeggiated crystal tones
  const notes = [
    { freq: 1396.91, start: 0, dur: 0.6 },     // F6
    { freq: 1760.00, start: 0.1, dur: 0.6 },   // A6
    { freq: 2093.00, start: 0.2, dur: 0.6 },   // C7
    { freq: 2637.02, start: 0.3, dur: 0.6 },   // E7
    { freq: 1396.91, start: 1.0, dur: 0.6 },
    { freq: 1760.00, start: 1.1, dur: 0.6 },
    { freq: 2093.00, start: 1.2, dur: 0.6 },
    { freq: 2637.02, start: 1.3, dur: 0.6 },
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const nt = t - note.start;
        const env = Math.exp(-nt * 3) * 0.08;
        // Crystal-like with harmonics
        sample += Math.sin(2 * Math.PI * note.freq * nt) * env;
        sample += Math.sin(2 * Math.PI * note.freq * 2.5 * nt) * env * 0.4;
        sample += Math.sin(2 * Math.PI * note.freq * 4 * nt) * env * 0.2;
      }
    }

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate Cascade - flowing, gentle melody
 */
function generateCascade(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.5;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  // Descending then ascending pattern
  const notes = [
    { freq: 987.77, start: 0 },      // B5
    { freq: 880.00, start: 0.15 },   // A5
    { freq: 783.99, start: 0.3 },    // G5
    { freq: 659.25, start: 0.45 },   // E5
    { freq: 783.99, start: 0.8 },
    { freq: 880.00, start: 0.95 },
    { freq: 987.77, start: 1.1 },
    { freq: 1174.66, start: 1.25 },  // D6
    { freq: 1318.51, start: 1.5 },   // E6
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + 0.35) {
        const nt = t - note.start;
        const env = Math.sin(Math.PI * nt / 0.35) * 0.12;
        sample += Math.sin(2 * Math.PI * note.freq * nt) * env;
        sample += Math.sin(2 * Math.PI * note.freq * 2 * nt) * env * 0.25;
      }
    }

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate Pulse - rhythmic, energizing
 */
function generatePulse(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.0;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  const beatInterval = 0.25;
  const freq = 523.25; // C5

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Create rhythmic pulses
    const beatPhase = (t % beatInterval) / beatInterval;
    const beatNum = Math.floor(t / beatInterval);

    if (beatNum < 8 && beatPhase < 0.5) {
      const env = (1 - beatPhase * 2) * 0.15;
      const freqMod = freq * (beatNum % 2 === 0 ? 1 : 1.5);
      sample = Math.sin(2 * Math.PI * freqMod * t) * env;
      sample += Math.sin(2 * Math.PI * freqMod * 0.5 * t) * env * 0.5;
    }

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate Zen - minimal, peaceful meditation tone
 */
function generateZen(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 3.5;
  const numFrames = duration * sampleRate;
  const buffer = audioContext.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  // Singing bowl frequencies
  const bowlFreq = 256; // C4

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;

    // Very slow attack, long sustain, gentle release
    let env;
    if (t < 0.5) {
      env = t / 0.5;
    } else if (t < 2.5) {
      env = 1;
    } else {
      env = 1 - (t - 2.5) / 1;
    }
    env *= 0.12;

    // Rich harmonic content like a singing bowl
    const fundamental = Math.sin(2 * Math.PI * bowlFreq * t);
    const h2 = Math.sin(2 * Math.PI * bowlFreq * 2.76 * t) * 0.5;
    const h3 = Math.sin(2 * Math.PI * bowlFreq * 5.4 * t) * 0.3;
    const h4 = Math.sin(2 * Math.PI * bowlFreq * 8.93 * t) * 0.15;

    // Subtle wobble
    const wobble = 1 + Math.sin(t * 4) * 0.02;

    const sample = (fundamental + h2 + h3 + h4) * env * wobble;

    leftData[i] = sample;
    rightData[i] = sample;
  }

  return buffer;
}

/**
 * Generate ringtone buffer based on selected type
 */
export function generateRingtone(audioContext: AudioContext, type: RingtoneType): AudioBuffer {
  switch (type) {
    case 'reflection':
      return generateReflection(audioContext);
    case 'ripple':
      return generateRipple(audioContext);
    case 'beacon':
      return generateBeacon(audioContext);
    case 'aurora':
      return generateAurora(audioContext);
    case 'prism':
      return generatePrism(audioContext);
    case 'cascade':
      return generateCascade(audioContext);
    case 'pulse':
      return generatePulse(audioContext);
    case 'zen':
      return generateZen(audioContext);
    default:
      return generateReflection(audioContext);
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
      // Handle legacy ringtone types
      const legacy: Record<string, RingtoneType> = {
        'chimes': 'reflection',
        'bells': 'beacon',
        'marimba': 'pulse',
        'piano': 'cascade',
        'harp': 'aurora',
      };
      const saved = settings.ringtone;
      return legacy[saved] || (AVAILABLE_RINGTONES.some(r => r.id === saved) ? saved : 'reflection');
    }
  } catch (error) {
    console.error('Error loading ringtone setting:', error);
  }
  return 'reflection';
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

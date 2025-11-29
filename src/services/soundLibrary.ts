/**
 * Sound Library Service
 *
 * Provides access to free sounds from various sources.
 * Currently supports:
 * - Built-in generated tones
 * - Pixabay free sounds (requires API key)
 */

// Sound categories for the library
export type SoundCategory = 'notification' | 'alarm' | 'music' | 'nature' | 'classic';

export interface Sound {
  id: string;
  name: string;
  category: SoundCategory;
  duration: number; // in seconds
  previewUrl: string;
  downloadUrl: string;
  source: 'builtin' | 'pixabay' | 'freesound';
  attribution?: string;
}

// Built-in sounds that don't require external API
export const BUILTIN_SOUNDS: Sound[] = [
  {
    id: 'builtin-gentle',
    name: 'Gentle Chime',
    category: 'notification',
    duration: 2,
    previewUrl: '', // Generated via Web Audio API
    downloadUrl: '',
    source: 'builtin',
  },
  {
    id: 'builtin-urgent',
    name: 'Urgent Alert',
    category: 'alarm',
    duration: 2,
    previewUrl: '',
    downloadUrl: '',
    source: 'builtin',
  },
  {
    id: 'builtin-classic',
    name: 'Classic Ring',
    category: 'classic',
    duration: 2,
    previewUrl: '',
    downloadUrl: '',
    source: 'builtin',
  },
  {
    id: 'builtin-marimba',
    name: 'Marimba',
    category: 'music',
    duration: 2,
    previewUrl: '',
    downloadUrl: '',
    source: 'builtin',
  },
  {
    id: 'builtin-cosmic',
    name: 'Cosmic Bell',
    category: 'notification',
    duration: 2,
    previewUrl: '',
    downloadUrl: '',
    source: 'builtin',
  },
];

// Curated free sounds from public domain / CC0 sources
// These are direct links to royalty-free sounds
export const CURATED_SOUNDS: Sound[] = [
  // Notification sounds
  {
    id: 'curated-ding',
    name: 'Modern Ding',
    category: 'notification',
    duration: 1,
    previewUrl: 'https://cdn.freesound.org/previews/320/320654_5260872-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/320/320654_5260872-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  {
    id: 'curated-bell',
    name: 'Soft Bell',
    category: 'notification',
    duration: 2,
    previewUrl: 'https://cdn.freesound.org/previews/411/411642_5121236-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/411/411642_5121236-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  {
    id: 'curated-chime',
    name: 'Glass Chime',
    category: 'notification',
    duration: 2,
    previewUrl: 'https://cdn.freesound.org/previews/536/536420_4921277-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/536/536420_4921277-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  // Music / melodic sounds
  {
    id: 'curated-piano',
    name: 'Piano Note',
    category: 'music',
    duration: 2,
    previewUrl: 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  {
    id: 'curated-harp',
    name: 'Harp Gliss',
    category: 'music',
    duration: 3,
    previewUrl: 'https://cdn.freesound.org/previews/456/456966_6142149-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/456/456966_6142149-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  // Nature sounds
  {
    id: 'curated-birds',
    name: 'Morning Birds',
    category: 'nature',
    duration: 5,
    previewUrl: 'https://cdn.freesound.org/previews/531/531947_7037-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/531/531947_7037-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  {
    id: 'curated-water',
    name: 'Water Drop',
    category: 'nature',
    duration: 1,
    previewUrl: 'https://cdn.freesound.org/previews/398/398032_4284968-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/398/398032_4284968-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  // Alarm sounds
  {
    id: 'curated-alarm',
    name: 'Digital Alarm',
    category: 'alarm',
    duration: 2,
    previewUrl: 'https://cdn.freesound.org/previews/250/250629_4486188-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/250/250629_4486188-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
  // Classic sounds
  {
    id: 'curated-telephone',
    name: 'Retro Phone',
    category: 'classic',
    duration: 3,
    previewUrl: 'https://cdn.freesound.org/previews/331/331912_5549847-lq.mp3',
    downloadUrl: 'https://cdn.freesound.org/previews/331/331912_5549847-lq.mp3',
    source: 'freesound',
    attribution: 'Sound from Freesound.org (CC0)',
  },
];

/**
 * Get all available sounds
 */
export function getAllSounds(): Sound[] {
  return [...BUILTIN_SOUNDS, ...CURATED_SOUNDS];
}

/**
 * Get sounds by category
 */
export function getSoundsByCategory(category: SoundCategory): Sound[] {
  return getAllSounds().filter(s => s.category === category);
}

/**
 * Get a sound by ID
 */
export function getSoundById(id: string): Sound | undefined {
  return getAllSounds().find(s => s.id === id);
}

/**
 * Get all categories with their sounds
 */
export function getSoundCategories(): { category: SoundCategory; label: string; sounds: Sound[] }[] {
  return [
    { category: 'notification', label: 'Notifications', sounds: getSoundsByCategory('notification') },
    { category: 'music', label: 'Musical', sounds: getSoundsByCategory('music') },
    { category: 'nature', label: 'Nature', sounds: getSoundsByCategory('nature') },
    { category: 'alarm', label: 'Alarms', sounds: getSoundsByCategory('alarm') },
    { category: 'classic', label: 'Classic', sounds: getSoundsByCategory('classic') },
  ];
}

/**
 * Play a sound preview
 */
export async function playSoundPreview(sound: Sound): Promise<void> {
  if (sound.source === 'builtin') {
    // Use Web Audio API for built-in sounds
    const { generateRingtone } = await import('../utils/ringtones');
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    // Map builtin IDs to ringtone types
    const ringtoneMap: Record<string, string> = {
      'builtin-gentle': 'aurora',
      'builtin-urgent': 'beacon',
      'builtin-classic': 'reflection',
      'builtin-marimba': 'prism',
      'builtin-cosmic': 'cascade',
    };

    const ringtoneType = ringtoneMap[sound.id] || 'reflection';
    const buffer = generateRingtone(audioContext, ringtoneType as Parameters<typeof generateRingtone>[1]);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();

    setTimeout(() => {
      source.stop();
      audioContext.close().catch(() => {});
    }, 2000);
  } else {
    // Play external sound via Audio element
    const audio = new Audio(sound.previewUrl);
    audio.volume = 0.7;

    return new Promise((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Failed to play sound'));
      audio.play().catch(reject);

      // Auto-stop after 5 seconds max
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        resolve();
      }, 5000);
    });
  }
}

/**
 * Download a sound for offline use
 * Stores in localStorage as base64
 */
export async function downloadSoundForOffline(sound: Sound): Promise<string | null> {
  if (sound.source === 'builtin') {
    // Built-in sounds are always available
    return sound.id;
  }

  try {
    const response = await fetch(sound.downloadUrl);
    if (!response.ok) throw new Error('Failed to download sound');

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Store in localStorage
        localStorage.setItem(`yfs-sound-${sound.id}`, base64);
        resolve(sound.id);
      };
      reader.onerror = () => reject(new Error('Failed to read sound data'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to download sound:', error);
    return null;
  }
}

/**
 * Get a cached sound from localStorage
 */
export function getCachedSound(soundId: string): string | null {
  return localStorage.getItem(`yfs-sound-${soundId}`);
}

/**
 * Check if a sound is cached
 */
export function isSoundCached(soundId: string): boolean {
  return localStorage.getItem(`yfs-sound-${soundId}`) !== null;
}

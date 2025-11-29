import { generateRingtone, getSelectedRingtone } from './ringtones';

// Notification permission types
type NotificationPermission = 'default' | 'denied' | 'granted';

// Audio context for playing sounds
let audioContext: AudioContext | null = null;
let ringtoneBuffer: AudioBuffer | null = null;
let ringtoneSource: AudioBufferSourceNode | null = null;

// Cleanup audio context to prevent memory leaks
export const cleanupAudioContext = (): void => {
  if (ringtoneSource) {
    try {
      ringtoneSource.stop();
    } catch {
      // Ignore if already stopped
    }
    ringtoneSource = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {
      // Ignore close errors
    });
    audioContext = null;
    ringtoneBuffer = null;
  }
};

// Initialize audio context
const initAudio = async (): Promise<AudioContext> => {
  if (!audioContext || audioContext.state === 'closed') {
    // @ts-ignore - webkitAudioContext for Safari
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();

    // Preload ringtone
    try {
      await loadRingtone();
    } catch (error) {
      console.error('Failed to load ringtone:', error);
    }
  }
  return audioContext;
};

// Load ringtone
const loadRingtone = async (): Promise<void> => {
  if (!audioContext) return;

  // Load selected ringtone type from settings
  const ringtoneType = getSelectedRingtone();
  ringtoneBuffer = generateRingtone(audioContext, ringtoneType);
};

// Play ringtone
const playRingtone = async (): Promise<void> => {
  if (!audioContext) {
    await initAudio();
  }
  
  if (!ringtoneBuffer && audioContext) {
    await loadRingtone();
  }
  
  if (ringtoneBuffer && audioContext) {
    // Stop any currently playing ringtone
    if (ringtoneSource) {
      ringtoneSource.stop();
    }
    
    ringtoneSource = audioContext.createBufferSource();
    ringtoneSource.buffer = ringtoneBuffer;
    ringtoneSource.loop = true;
    ringtoneSource.connect(audioContext.destination);
    
    // Start playing
    ringtoneSource.start();
  }
};

// Stop ringtone
const stopRingtone = (): void => {
  if (ringtoneSource) {
    ringtoneSource.stop();
    ringtoneSource = null;
  }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermission;
  }
  
  return 'denied';
};

// Show notification
const showNotification = async (title: string, options?: NotificationOptions): Promise<Notification | null> => {
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }
  
  // If the browser doesn't support service workers, use the Notification API directly
  if (!('serviceWorker' in navigator)) {
    return new Notification(title, options);
  }
  
  // Otherwise, use the service worker to show the notification
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return null;
  } catch (error) {
    console.error('Error showing notification:', error);
    return new Notification(title, options);
  }
};

// Show call notification with ringtone
export const showCallNotification = async (caller: string, message: string): Promise<void> => {
  // Play ringtone
  await playRingtone();
  
  // Show notification
  const notification = await showNotification(`Incoming Call: ${caller}`, {
    body: message,
    icon: '/favicon.ico', // Replace with your app icon
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'incoming-call',
    data: {
      type: 'call',
      timestamp: Date.now(),
      caller
    },
    actions: [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' }
    ]
  });
  
  // Handle notification click
  if (notification) {
    notification.onclick = (event) => {
      event.preventDefault();
      stopRingtone();
      // Focus the app window
      window.focus();
      // Handle the call answer here
    };
    
    notification.onclose = () => {
      stopRingtone();
    };
  }
};

// Stop all notifications and sounds
export const stopAllNotifications = (): void => {
  stopRingtone();

  // Close all notifications
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration()
      .then(registration => {
        if (registration) {
          registration.getNotifications().then(notifications => {
            notifications.forEach(notification => notification.close());
          }).catch(err => {
            console.warn('Failed to get notifications:', err);
          });
        }
      })
      .catch(err => {
        console.warn('Failed to get service worker registration:', err);
      });
  }
};

/**
 * Push Notifications Manager
 *
 * Handles Web Push API integration for background notifications.
 * Works with the service worker to show notifications even when the app is closed.
 */

import logger from './logger';

// VAPID public key from environment variable
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return 'denied';
}

/**
 * Get the service worker registration
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    logger.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    logger.warn('Push notifications not supported');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    logger.error('VAPID public key not configured. Set VITE_VAPID_PUBLIC_KEY environment variable.');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    logger.warn('Notification permission not granted');
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    logger.error('No service worker registration');
    return null;
  }

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    const json = subscription.toJSON();

    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      logger.error('Invalid push subscription data');
      return null;
    }

    return {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    };
  } catch (error) {
    logger.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

/**
 * Show a local notification (when app is in foreground)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  const registration = await getServiceWorkerRegistration();
  if (registration) {
    await registration.showNotification(title, {
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      ...options,
    });
  }
}

/**
 * Schedule a local notification for a specific time
 * Uses the Notification API with service worker
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerTime: number,
  data?: Record<string, unknown>
): Promise<string | null> {
  const now = Date.now();
  const delay = triggerTime - now;

  if (delay <= 0) {
    // Trigger immediately
    await showLocalNotification(title, {
      body,
      tag: `reminder-${Date.now()}`,
      data,
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'snooze', title: 'Snooze' },
      ],
    });
    return null;
  }

  // Store scheduled notification in localStorage for persistence
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const scheduled = getScheduledNotifications();
  scheduled.push({
    id: notificationId,
    title,
    body,
    triggerTime,
    data,
  });
  localStorage.setItem('yfs-scheduled-notifications', JSON.stringify(scheduled));

  // Set a timeout for this session (will be lost on page close, but service worker handles background)
  setTimeout(() => {
    showLocalNotification(title, {
      body,
      tag: notificationId,
      data,
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'snooze', title: 'Snooze' },
      ],
    });
    // Remove from scheduled
    removeScheduledNotification(notificationId);
  }, delay);

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(notificationId: string): void {
  removeScheduledNotification(notificationId);
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): Array<{
  id: string;
  title: string;
  body: string;
  triggerTime: number;
  data?: Record<string, unknown>;
}> {
  try {
    const stored = localStorage.getItem('yfs-scheduled-notifications');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a scheduled notification from storage
 */
function removeScheduledNotification(notificationId: string): void {
  const scheduled = getScheduledNotifications();
  const filtered = scheduled.filter(n => n.id !== notificationId);
  localStorage.setItem('yfs-scheduled-notifications', JSON.stringify(filtered));
}

/**
 * Check and trigger any due scheduled notifications
 * Called on app load and periodically
 */
export async function checkScheduledNotifications(): Promise<void> {
  const now = Date.now();
  const scheduled = getScheduledNotifications();

  for (const notif of scheduled) {
    if (notif.triggerTime <= now) {
      await showLocalNotification(notif.title, {
        body: notif.body,
        tag: notif.id,
        data: notif.data,
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'snooze', title: 'Snooze' },
        ],
      });
      removeScheduledNotification(notif.id);
    }
  }
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Initialize push notifications system
 */
export async function initializePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) {
    logger.warn('Push notifications not supported in this browser');
    return false;
  }

  // Check for scheduled notifications on load
  await checkScheduledNotifications();

  // Set up periodic check for scheduled notifications
  setInterval(checkScheduledNotifications, 30000); // Check every 30 seconds

  // Subscribe to push if permission granted
  const permission = await requestNotificationPermission();
  if (permission === 'granted') {
    await subscribeToPush();
    return true;
  }

  return false;
}

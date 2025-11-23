interface NotificationOptions {
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
  body?: string;
  tag?: string;
  icon?: string;
  image?: string;
  badge?: string;
  vibrate?: number[];
  timestamp?: number;
  renotify?: boolean;
  silent?: boolean;
  requireInteraction?: boolean;
  data?: any;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

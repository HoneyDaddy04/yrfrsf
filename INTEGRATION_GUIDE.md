# Reminder Scheduler Integration Guide

This guide shows you how to integrate the reminder scheduling system into your React + IndexedDB app.

## 📦 Files Created

- `src/utils/reminderScheduler.ts` - Core scheduling logic
- `src/hooks/useReminderScheduler.ts` - React hook for scheduler
- `src/hooks/useReminderCountdown.ts` - React hook for live countdowns

## 🚀 Quick Start

### 1. Set Up IndexedDB (Example)

```typescript
// src/db/reminderDB.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Reminder } from '../utils/reminderScheduler';

interface ReminderDB extends DBSchema {
  reminders: {
    key: string;
    value: Reminder;
    indexes: { 'by-nextTrigger': number };
  };
}

let db: IDBPDatabase<ReminderDB> | null = null;

export async function initDB() {
  db = await openDB<ReminderDB>('reminder-db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('reminders', { keyPath: 'id' });
      store.createIndex('by-nextTrigger', 'nextTrigger');
    },
  });
  return db;
}

export async function getAllReminders(): Promise<Reminder[]> {
  if (!db) await initDB();
  return db!.getAll('reminders');
}

export async function addReminder(reminder: Reminder): Promise<void> {
  if (!db) await initDB();
  await db!.add('reminders', reminder);
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  if (!db) await initDB();
  await db!.put('reminders', reminder);
}

export async function deleteReminder(id: string): Promise<void> {
  if (!db) await initDB();
  await db!.delete('reminders', id);
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  if (!db) await initDB();
  return db!.get('reminders', id);
}
```

### 2. Initialize Scheduler in Your App

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { useReminderScheduler } from './hooks/useReminderScheduler';
import { getAllReminders, updateReminder, initDB } from './db/reminderDB';
import { requestNotificationPermission } from './utils/reminderScheduler';

function App() {
  // Initialize database
  useEffect(() => {
    initDB();
    requestNotificationPermission(); // Request notification permission
  }, []);

  // Start the scheduler
  useReminderScheduler({
    getAllReminders,
    updateReminder,
    checkInterval: 5000, // Check every 5 seconds
    enabled: true,
  });

  return (
    <div className="App">
      <h1>AI Reminder App</h1>
      {/* Your components here */}
    </div>
  );
}

export default App;
```

### 3. Create a Reminder with Auto-Scheduling

```typescript
// src/components/CreateReminder.tsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addReminder } from '../db/reminderDB';
import { computeNextTrigger, validateReminder, RepeatType } from '../utils/reminderScheduler';

export function CreateReminder() {
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<RepeatType>('daily');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const reminder = {
      id: uuidv4(),
      title,
      why,
      time,
      repeat,
      nextTrigger: 0, // Will be computed below
      active: true,
      createdAt: Date.now(),
    };

    // Validate reminder
    const validation = validateReminder(reminder);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Compute next trigger time
    reminder.nextTrigger = computeNextTrigger(reminder);

    // Save to IndexedDB
    await addReminder(reminder);

    console.log('✅ Reminder created:', reminder);
    console.log('📅 Next trigger:', new Date(reminder.nextTrigger).toLocaleString());

    // Reset form
    setTitle('');
    setWhy('');
    setTime('09:00');
    setRepeat('daily');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Reminder title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      
      <textarea
        placeholder="Why is this important?"
        value={why}
        onChange={(e) => setWhy(e.target.value)}
      />
      
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />
      
      <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatType)}>
        <option value="once">Once</option>
        <option value="hourly">Hourly</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      
      <button type="submit">Create Reminder</button>
    </form>
  );
}
```

### 4. Display Reminders with Live Countdown

```typescript
// src/components/ReminderList.tsx
import React, { useState, useEffect } from 'react';
import { getAllReminders } from '../db/reminderDB';
import { useReminderCountdown } from '../hooks/useReminderCountdown';
import { Reminder } from '../utils/reminderScheduler';

export function ReminderList() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    loadReminders();
    
    // Refresh list every 10 seconds
    const interval = setInterval(loadReminders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    const allReminders = await getAllReminders();
    setReminders(allReminders.filter(r => r.active));
  };

  return (
    <div className="reminder-list">
      <h2>Active Reminders</h2>
      {reminders.map((reminder) => (
        <ReminderCard key={reminder.id} reminder={reminder} />
      ))}
    </div>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const countdown = useReminderCountdown(reminder);

  return (
    <div className="reminder-card">
      <h3>{reminder.title}</h3>
      <p>{reminder.why}</p>
      <div className="reminder-meta">
        <span>🕐 {reminder.time}</span>
        <span>🔁 {reminder.repeat}</span>
      </div>
      <div className="countdown">{countdown}</div>
    </div>
  );
}
```

## 🔧 Advanced Usage

### Custom Repeat Intervals

```typescript
const reminder = {
  id: uuidv4(),
  title: 'Drink water',
  why: 'Stay hydrated',
  time: '09:00',
  repeat: 'custom' as RepeatType,
  customInterval: 30 * 60 * 1000, // Every 30 minutes
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

reminder.nextTrigger = computeNextTrigger(reminder);
await addReminder(reminder);
```

### Updating a Reminder

```typescript
import { getReminder, updateReminder } from '../db/reminderDB';
import { computeNextTrigger } from '../utils/reminderScheduler';

async function updateReminderTime(id: string, newTime: string) {
  const reminder = await getReminder(id);
  if (!reminder) return;

  // Update time and recalculate next trigger
  reminder.time = newTime;
  reminder.nextTrigger = computeNextTrigger(reminder);

  await updateReminder(reminder);
}
```

### Pausing/Resuming Reminders

```typescript
async function toggleReminder(id: string) {
  const reminder = await getReminder(id);
  if (!reminder) return;

  reminder.active = !reminder.active;

  // If reactivating, recalculate next trigger
  if (reminder.active) {
    reminder.nextTrigger = computeNextTrigger(reminder);
  }

  await updateReminder(reminder);
}
```

## 🎯 Key Features Implemented

✅ **Automatic Time Benchmarking**
- Compares reminder time against current time
- Auto-rolls forward if time has passed (next hour/day/week)

✅ **Real-Time Scheduler**
- Checks every 5 seconds (configurable)
- Triggers reminders when due
- Auto-updates next occurrence for recurring reminders

✅ **Repeat Logic**
- Once (one-time, then deactivates)
- Hourly (every hour)
- Daily (same time every day)
- Weekly (same day/time every week)
- Custom (configurable interval in ms)

✅ **Live Countdown**
- React hook for real-time countdown display
- Updates every second
- Shows "Overdue by X" if past due

✅ **Browser Notifications**
- Optional notification support
- Permission request helper
- Prevents duplicate notifications

✅ **UTC Timestamps**
- All times stored in UTC
- No timezone drift issues

## 🔔 Customizing Trigger Behavior

Replace the `triggerReminder` function in `reminderScheduler.ts`:

```typescript
export function triggerReminder(reminder: Reminder): void {
  console.log("🔔 Reminder Triggered:", reminder.title);
  
  // Your custom logic here:
  // - Initiate WebRTC call
  // - Play audio alert
  // - Show modal
  // - Send to backend
  
  // Example: Custom event
  window.dispatchEvent(new CustomEvent('reminderTriggered', {
    detail: reminder
  }));
}
```

Then listen for the event in your React component:

```typescript
useEffect(() => {
  const handleReminder = (e: CustomEvent) => {
    const reminder = e.detail;
    // Start your AI voice call here
    initiateAICall(reminder);
  };

  window.addEventListener('reminderTriggered', handleReminder as EventListener);
  return () => window.removeEventListener('reminderTriggered', handleReminder as EventListener);
}, []);
```

## 📝 Notes

- The scheduler runs as long as the app is open
- If the app is closed, reminders won't trigger (consider using Service Workers for background triggers)
- All timestamps are in UTC to avoid timezone issues
- The scheduler is lightweight and won't impact performance

## 🐛 Troubleshooting

**Reminders not triggering?**
- Check browser console for errors
- Verify `nextTrigger` is set correctly
- Ensure `active` is `true`
- Check that scheduler is running (look for "✅ Reminder scheduler started" in console)

**Countdown not updating?**
- Verify the hook is being used correctly
- Check that `nextTrigger` is a valid timestamp

**Notifications not showing?**
- Call `requestNotificationPermission()` on app load
- Check browser notification settings
- Ensure HTTPS (required for notifications in most browsers)

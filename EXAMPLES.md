# Reminder Scheduler - Usage Examples

## Example 1: Morning Routine Reminder

```typescript
import { v4 as uuidv4 } from 'uuid';
import { computeNextTrigger } from './utils/reminderScheduler';
import { addReminder } from './db/reminderDB';

const morningReminder = {
  id: uuidv4(),
  title: 'Morning Workout',
  why: 'Start your day with energy and focus',
  time: '06:30',
  repeat: 'daily' as const,
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

morningReminder.nextTrigger = computeNextTrigger(morningReminder);
await addReminder(morningReminder);

// If it's currently 8:00 AM, nextTrigger will be tomorrow at 6:30 AM
// If it's currently 5:00 AM, nextTrigger will be today at 6:30 AM
```

## Example 2: Hourly Water Reminder

```typescript
const waterReminder = {
  id: uuidv4(),
  title: 'Drink Water',
  why: 'Stay hydrated throughout the day',
  time: '09:00', // Starting time
  repeat: 'hourly' as const,
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

waterReminder.nextTrigger = computeNextTrigger(waterReminder);
await addReminder(waterReminder);

// Will trigger at 9:00, 10:00, 11:00, etc.
```

## Example 3: Weekly Team Meeting

```typescript
const meetingReminder = {
  id: uuidv4(),
  title: 'Team Standup',
  why: 'Weekly sync with the team',
  time: '14:00',
  repeat: 'weekly' as const,
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

meetingReminder.nextTrigger = computeNextTrigger(meetingReminder);
await addReminder(meetingReminder);

// Will trigger every 7 days at 2:00 PM
```

## Example 4: One-Time Appointment

```typescript
const appointmentReminder = {
  id: uuidv4(),
  title: 'Doctor Appointment',
  why: 'Annual checkup',
  time: '15:30',
  repeat: 'once' as const,
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

appointmentReminder.nextTrigger = computeNextTrigger(appointmentReminder);
await addReminder(appointmentReminder);

// Will trigger once, then automatically deactivate
```

## Example 5: Custom Interval (Every 30 Minutes)

```typescript
const focusReminder = {
  id: uuidv4(),
  title: 'Take a Break',
  why: 'Rest your eyes and stretch',
  time: '09:00',
  repeat: 'custom' as const,
  customInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

focusReminder.nextTrigger = computeNextTrigger(focusReminder);
await addReminder(focusReminder);

// Will trigger every 30 minutes starting from 9:00 AM
```

## Example 6: Complete React Component

```typescript
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  computeNextTrigger, 
  validateReminder,
  RepeatType,
  Reminder 
} from '../utils/reminderScheduler';
import { addReminder, getAllReminders, updateReminder, deleteReminder } from '../db/reminderDB';
import { useReminderCountdown } from '../hooks/useReminderCountdown';

export function ReminderManager() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<RepeatType>('daily');

  // Load reminders on mount
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const all = await getAllReminders();
    setReminders(all);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const newReminder: Reminder = {
      id: uuidv4(),
      title,
      why,
      time,
      repeat,
      nextTrigger: 0,
      active: true,
      createdAt: Date.now(),
    };

    // Validate
    const validation = validateReminder(newReminder);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Compute next trigger
    newReminder.nextTrigger = computeNextTrigger(newReminder);

    // Save
    await addReminder(newReminder);
    await loadReminders();

    // Reset form
    setTitle('');
    setWhy('');
    setTime('09:00');
    setRepeat('daily');
  };

  const handleToggle = async (reminder: Reminder) => {
    const updated = { ...reminder, active: !reminder.active };
    
    // Recalculate next trigger if reactivating
    if (updated.active) {
      updated.nextTrigger = computeNextTrigger(updated);
    }
    
    await updateReminder(updated);
    await loadReminders();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this reminder?')) {
      await deleteReminder(id);
      await loadReminders();
    }
  };

  return (
    <div className="reminder-manager">
      <h2>Create Reminder</h2>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Title"
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
        <button type="submit">Create</button>
      </form>

      <h2>Active Reminders</h2>
      <div className="reminder-list">
        {reminders.map((reminder) => (
          <ReminderItem
            key={reminder.id}
            reminder={reminder}
            onToggle={() => handleToggle(reminder)}
            onDelete={() => handleDelete(reminder.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ReminderItem({ 
  reminder, 
  onToggle, 
  onDelete 
}: { 
  reminder: Reminder; 
  onToggle: () => void; 
  onDelete: () => void;
}) {
  const countdown = useReminderCountdown(reminder);

  return (
    <div className={`reminder-item ${!reminder.active ? 'inactive' : ''}`}>
      <div className="reminder-header">
        <h3>{reminder.title}</h3>
        <div className="reminder-actions">
          <button onClick={onToggle}>
            {reminder.active ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <button onClick={onDelete}>🗑️ Delete</button>
        </div>
      </div>
      
      <p className="reminder-why">{reminder.why}</p>
      
      <div className="reminder-meta">
        <span>🕐 {reminder.time}</span>
        <span>🔁 {reminder.repeat}</span>
      </div>
      
      {reminder.active && (
        <div className="reminder-countdown">
          ⏱️ {countdown}
        </div>
      )}
      
      <div className="reminder-next-trigger">
        Next: {new Date(reminder.nextTrigger).toLocaleString()}
      </div>
    </div>
  );
}
```

## Example 7: Testing the Scheduler

```typescript
// Test file: reminderScheduler.test.ts
import { computeNextTrigger, Reminder } from './reminderScheduler';

describe('computeNextTrigger', () => {
  it('should schedule for today if time has not passed', () => {
    const now = new Date();
    const futureHour = (now.getHours() + 2) % 24;
    
    const reminder: Reminder = {
      id: '1',
      title: 'Test',
      why: 'Testing',
      time: `${futureHour.toString().padStart(2, '0')}:00`,
      repeat: 'daily',
      nextTrigger: 0,
      active: true,
      createdAt: Date.now(),
    };

    const nextTrigger = computeNextTrigger(reminder);
    const nextDate = new Date(nextTrigger);
    
    expect(nextDate.getDate()).toBe(now.getDate());
    expect(nextDate.getHours()).toBe(futureHour);
  });

  it('should schedule for tomorrow if time has passed', () => {
    const now = new Date();
    const pastHour = (now.getHours() - 2 + 24) % 24;
    
    const reminder: Reminder = {
      id: '1',
      title: 'Test',
      why: 'Testing',
      time: `${pastHour.toString().padStart(2, '0')}:00`,
      repeat: 'daily',
      nextTrigger: 0,
      active: true,
      createdAt: Date.now(),
    };

    const nextTrigger = computeNextTrigger(reminder);
    const nextDate = new Date(nextTrigger);
    
    expect(nextDate.getDate()).toBe(now.getDate() + 1);
  });

  it('should handle hourly repeats correctly', () => {
    const reminder: Reminder = {
      id: '1',
      title: 'Test',
      why: 'Testing',
      time: '09:00',
      repeat: 'hourly',
      nextTrigger: 0,
      active: true,
      createdAt: Date.now(),
    };

    const nextTrigger = computeNextTrigger(reminder);
    expect(nextTrigger).toBeGreaterThan(Date.now());
  });
});
```

## Example 8: Listening for Trigger Events

```typescript
// In your main App component
import { useEffect } from 'react';
import { Reminder } from './utils/reminderScheduler';

function App() {
  useEffect(() => {
    // Listen for reminder triggers
    const handleReminderTrigger = (event: CustomEvent<Reminder>) => {
      const reminder = event.detail;
      
      // Your custom logic here
      console.log('Reminder triggered!', reminder);
      
      // Example: Show a modal
      showReminderModal(reminder);
      
      // Example: Play a sound
      playNotificationSound();
      
      // Example: Start AI voice call
      initiateAICall(reminder);
    };

    window.addEventListener('reminderTriggered', handleReminderTrigger as EventListener);
    
    return () => {
      window.removeEventListener('reminderTriggered', handleReminderTrigger as EventListener);
    };
  }, []);

  return <div>Your App</div>;
}

// Modify triggerReminder in reminderScheduler.ts to dispatch event:
export function triggerReminder(reminder: Reminder): void {
  console.log("🔔 Reminder Triggered:", reminder.title);
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('reminderTriggered', {
    detail: reminder
  }));
  
  // Browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`Reminder: ${reminder.title}`, {
      body: reminder.why,
      tag: reminder.id,
    });
  }
}
```

## Example 9: Bulk Import Reminders

```typescript
const bulkReminders = [
  { title: 'Morning Meditation', time: '06:00', repeat: 'daily' },
  { title: 'Lunch Break', time: '12:00', repeat: 'daily' },
  { title: 'Evening Walk', time: '18:00', repeat: 'daily' },
  { title: 'Read Before Bed', time: '21:00', repeat: 'daily' },
];

async function importReminders() {
  for (const data of bulkReminders) {
    const reminder: Reminder = {
      id: uuidv4(),
      title: data.title,
      why: '',
      time: data.time,
      repeat: data.repeat as RepeatType,
      nextTrigger: 0,
      active: true,
      createdAt: Date.now(),
    };

    reminder.nextTrigger = computeNextTrigger(reminder);
    await addReminder(reminder);
  }
  
  console.log('✅ Imported', bulkReminders.length, 'reminders');
}
```

## Example 10: Export/Backup Reminders

```typescript
async function exportReminders() {
  const reminders = await getAllReminders();
  const json = JSON.stringify(reminders, null, 2);
  
  // Download as JSON file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reminders-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importFromBackup(file: File) {
  const text = await file.text();
  const reminders: Reminder[] = JSON.parse(text);
  
  for (const reminder of reminders) {
    // Recalculate next trigger for imported reminders
    reminder.nextTrigger = computeNextTrigger(reminder);
    await addReminder(reminder);
  }
  
  console.log('✅ Imported', reminders.length, 'reminders from backup');
}
```

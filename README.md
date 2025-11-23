# AI Reminder App - Real-Time Scheduling System

A browser-based reminder scheduling system built with React, TypeScript, and IndexedDB. Features automatic time benchmarking, real-time triggering, and support for multiple repeat patterns.

## 🚀 Features

- ✅ **Real-time scheduling** - Automatically triggers reminders when due
- ✅ **Smart time calculation** - Auto-rolls forward if scheduled time has passed
- ✅ **Multiple repeat patterns** - Once, hourly, daily, weekly, or custom intervals
- ✅ **Live countdown** - Real-time "Next in 1h 23m 42s" display
- ✅ **Browser notifications** - Optional desktop notifications
- ✅ **UTC timestamps** - No timezone drift issues
- ✅ **Fully local** - No backend required, runs entirely in browser
- ✅ **TypeScript** - Full type safety

## 📁 Project Structure

```
src/
├── utils/
│   └── reminderScheduler.ts      # Core scheduling logic
├── hooks/
│   ├── useReminderScheduler.ts   # React hook for scheduler
│   └── useReminderCountdown.ts   # React hook for live countdowns
└── db/
    └── reminderDB.ts              # IndexedDB wrapper (you create this)

INTEGRATION_GUIDE.md               # Step-by-step integration guide
EXAMPLES.md                        # 10+ usage examples
README.md                          # This file
```

## 🔧 Installation

1. **Install dependencies:**
```bash
npm install idb uuid
npm install -D @types/uuid
```

2. **Copy the files** from this repo into your project

3. **Set up IndexedDB** (see `INTEGRATION_GUIDE.md`)

4. **Start the scheduler** in your main App component:

```typescript
import { useReminderScheduler } from './hooks/useReminderScheduler';
import { getAllReminders, updateReminder } from './db/reminderDB';

function App() {
  useReminderScheduler({
    getAllReminders,
    updateReminder,
    checkInterval: 5000,
  });

  return <YourApp />;
}
```

## 📖 Quick Start

### Create a Reminder

```typescript
import { v4 as uuidv4 } from 'uuid';
import { computeNextTrigger } from './utils/reminderScheduler';
import { addReminder } from './db/reminderDB';

const reminder = {
  id: uuidv4(),
  title: 'Morning Workout',
  why: 'Start your day with energy',
  time: '06:30',
  repeat: 'daily',
  nextTrigger: 0,
  active: true,
  createdAt: Date.now(),
};

// Automatically calculate next trigger time
reminder.nextTrigger = computeNextTrigger(reminder);

// Save to IndexedDB
await addReminder(reminder);
```

### Display with Live Countdown

```typescript
import { useReminderCountdown } from './hooks/useReminderCountdown';

function ReminderCard({ reminder }) {
  const countdown = useReminderCountdown(reminder);
  
  return (
    <div>
      <h3>{reminder.title}</h3>
      <p>{countdown}</p> {/* "Next reminder in 1h 23m 42s" */}
    </div>
  );
}
```

## 🎯 Core API

### `computeNextTrigger(reminder: Reminder): number`
Calculates the next trigger timestamp based on current time and repeat pattern.

```typescript
const nextTrigger = computeNextTrigger(reminder);
// Returns UTC timestamp in milliseconds
```

### `startReminderScheduler(getAllReminders, updateReminder, checkInterval?): () => void`
Starts the scheduler that checks for due reminders.

```typescript
const stopScheduler = startReminderScheduler(
  getAllReminders,
  updateReminder,
  5000 // Check every 5 seconds
);

// Later: stop the scheduler
stopScheduler();
```

### `triggerReminder(reminder: Reminder): void`
Called when a reminder is due. Customize this for your needs (AI call, modal, etc.).

```typescript
export function triggerReminder(reminder: Reminder): void {
  console.log("🔔 Reminder Triggered:", reminder.title);
  
  // Your custom logic:
  initiateAICall(reminder);
  showModal(reminder);
  playSound();
}
```

### `getTimeUntilNextTrigger(reminder: Reminder): string`
Returns human-readable countdown string.

```typescript
getTimeUntilNextTrigger(reminder);
// Returns: "Next reminder in 1h 23m 42s"
// Or: "Overdue by 5m"
```

## 🔁 Repeat Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `once` | One-time reminder, deactivates after trigger | Appointment |
| `hourly` | Every hour | Drink water |
| `daily` | Same time every day | Morning routine |
| `weekly` | Same day/time every week | Team meeting |
| `custom` | Custom interval in ms | Every 30 minutes |

## 📚 Documentation

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Complete setup guide
- **[EXAMPLES.md](./EXAMPLES.md)** - 10+ real-world examples

## 🔔 Notification Support

Request permission on app load:

```typescript
import { requestNotificationPermission } from './utils/reminderScheduler';

useEffect(() => {
  requestNotificationPermission();
}, []);
```

Browser notifications will automatically show when reminders trigger (if permission granted).

## 🧪 Testing

The scheduler includes validation and error handling:

```typescript
import { validateReminder } from './utils/reminderScheduler';

const validation = validateReminder(reminder);
if (!validation.isValid) {
  console.error(validation.error);
}
```

## ⚙️ Configuration

### Adjust Check Interval

```typescript
useReminderScheduler({
  getAllReminders,
  updateReminder,
  checkInterval: 10000, // Check every 10 seconds instead of 5
});
```

### Custom Intervals

```typescript
const reminder = {
  // ... other fields
  repeat: 'custom',
  customInterval: 30 * 60 * 1000, // 30 minutes
};
```

## 🎨 UI Integration

The system is UI-agnostic. Use with any React UI library:

```typescript
// With Material-UI
<Card>
  <CardContent>
    <Typography variant="h5">{reminder.title}</Typography>
    <Typography color="textSecondary">
      {useReminderCountdown(reminder)}
    </Typography>
  </CardContent>
</Card>

// With Tailwind CSS
<div className="bg-white rounded-lg shadow p-4">
  <h3 className="text-xl font-bold">{reminder.title}</h3>
  <p className="text-gray-600">{useReminderCountdown(reminder)}</p>
</div>
```

## 🐛 Troubleshooting

**Reminders not triggering?**
- Check console for "✅ Reminder scheduler started"
- Verify `nextTrigger` is set correctly
- Ensure `active` is `true`

**Countdown not updating?**
- Verify hook is used inside component
- Check that `nextTrigger` is valid timestamp

**TypeScript errors?**
- Ensure all dependencies are installed
- Check that types are imported correctly

## 📝 Notes

- Scheduler runs only while app is open
- For background triggers, consider Service Workers
- All times stored in UTC
- Lightweight - minimal performance impact

## 🔮 Future Enhancements

- [ ] Service Worker for background triggers
- [ ] Snooze functionality
- [ ] Reminder history/logs
- [ ] Smart scheduling (ML-based optimal times)
- [ ] Voice input for creating reminders
- [ ] Sync across devices

## 📄 License

MIT - Use freely in your projects

## 🤝 Contributing

This is a standalone module. Feel free to adapt and extend for your needs.

---

**Ready to integrate?** Start with [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

**Need examples?** Check out [EXAMPLES.md](./EXAMPLES.md)

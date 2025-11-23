# Quick Reference - AI Reminder Scheduler

## 🚀 One-Minute Setup

```bash
npm install idb uuid react
npm install -D @types/uuid
```

```typescript
// App.tsx
import { useReminderScheduler } from './hooks/useReminderScheduler';
import { getAllReminders, updateReminder, initDB } from './db/reminderDB';

function App() {
  useEffect(() => { initDB(); }, []);
  
  useReminderScheduler({
    getAllReminders,
    updateReminder,
    checkInterval: 5000,
  });
  
  return <YourApp />;
}
```

## 📝 Create a Reminder

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

reminder.nextTrigger = computeNextTrigger(reminder);
await addReminder(reminder);
```

## 🎯 Core Functions

### computeNextTrigger(reminder)
Calculates when reminder should trigger next.

```typescript
const nextTrigger = computeNextTrigger(reminder);
// Returns: UTC timestamp in milliseconds
```

### startReminderScheduler(getAllReminders, updateReminder, interval?)
Starts checking for due reminders.

```typescript
const stop = startReminderScheduler(
  getAllReminders,
  updateReminder,
  5000 // Check every 5 seconds
);

// Later: stop();
```

### triggerReminder(reminder)
Called when reminder is due. **Customize this!**

```typescript
export function triggerReminder(reminder: Reminder): void {
  // Your custom logic here
  initiateAICall(reminder);
}
```

### getTimeUntilNextTrigger(reminder)
Returns human-readable countdown.

```typescript
getTimeUntilNextTrigger(reminder);
// "Next reminder in 1h 23m 42s"
```

### validateReminder(reminder)
Validates reminder before saving.

```typescript
const { isValid, error } = validateReminder(reminder);
if (!isValid) console.error(error);
```

## 🪝 React Hooks

### useReminderScheduler
Manages scheduler lifecycle.

```typescript
useReminderScheduler({
  getAllReminders,
  updateReminder,
  checkInterval: 5000,
  enabled: true,
});
```

### useReminderCountdown
Live countdown for UI.

```typescript
function ReminderCard({ reminder }) {
  const countdown = useReminderCountdown(reminder);
  return <div>{countdown}</div>;
}
```

## 💾 Database Functions

### CRUD Operations

```typescript
// Create
await addReminder(reminder);

// Read
const reminder = await getReminder(id);
const all = await getAllReminders();

// Update
await updateReminder(reminder);

// Delete
await deleteReminder(id);
```

### Queries

```typescript
// Get active reminders
const active = await getActiveReminders();

// Get upcoming reminders
const upcoming = await getUpcomingReminders(10); // limit 10

// Get overdue reminders
const overdue = await getOverdueReminders();

// Search by title/why
const results = await searchReminders('workout');

// Get stats
const stats = await getDBStats();
```

### Batch Operations

```typescript
// Add multiple
await addReminders([reminder1, reminder2, reminder3]);

// Update multiple
await updateReminders([updated1, updated2]);

// Delete multiple
await deleteReminders(['id1', 'id2', 'id3']);
```

### Import/Export

```typescript
// Export to JSON
const json = await exportRemindersJSON();

// Import from JSON
await importRemindersJSON(json, clearExisting);
```

## 🔁 Repeat Types

| Type | Description | Use Case |
|------|-------------|----------|
| `once` | One-time, then deactivates | Appointments |
| `hourly` | Every hour | Drink water |
| `daily` | Same time every day | Morning routine |
| `weekly` | Same day/time weekly | Team meeting |
| `custom` | Custom interval (ms) | Every 30 minutes |

## 🎨 UI Examples

### Create Form

```typescript
function CreateReminder() {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState('daily');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const reminder = {
      id: uuidv4(),
      title,
      why: '',
      time,
      repeat,
      nextTrigger: 0,
      active: true,
      createdAt: Date.now(),
    };
    reminder.nextTrigger = computeNextTrigger(reminder);
    await addReminder(reminder);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <input type="time" value={time} onChange={e => setTime(e.target.value)} />
      <select value={repeat} onChange={e => setRepeat(e.target.value)}>
        <option value="once">Once</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      <button type="submit">Create</button>
    </form>
  );
}
```

### Reminder List

```typescript
function ReminderList() {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    getAllReminders().then(setReminders);
  }, []);

  return (
    <div>
      {reminders.map(r => (
        <ReminderCard key={r.id} reminder={r} />
      ))}
    </div>
  );
}

function ReminderCard({ reminder }) {
  const countdown = useReminderCountdown(reminder);
  
  return (
    <div>
      <h3>{reminder.title}</h3>
      <p>{reminder.why}</p>
      <div>🕐 {reminder.time} • 🔁 {reminder.repeat}</div>
      <div>⏱️ {countdown}</div>
    </div>
  );
}
```

## 🔧 Common Tasks

### Update Reminder Time

```typescript
async function updateTime(id, newTime) {
  const reminder = await getReminder(id);
  reminder.time = newTime;
  reminder.nextTrigger = computeNextTrigger(reminder);
  await updateReminder(reminder);
}
```

### Pause/Resume Reminder

```typescript
async function toggleReminder(id) {
  const reminder = await getReminder(id);
  reminder.active = !reminder.active;
  if (reminder.active) {
    reminder.nextTrigger = computeNextTrigger(reminder);
  }
  await updateReminder(reminder);
}
```

### Snooze Reminder (10 minutes)

```typescript
async function snoozeReminder(id) {
  const reminder = await getReminder(id);
  reminder.nextTrigger = Date.now() + (10 * 60 * 1000);
  await updateReminder(reminder);
}
```

### Create Test Reminder (1 minute)

```typescript
async function createTestReminder() {
  const now = new Date();
  const testTime = new Date(now.getTime() + 60000);
  const time = `${testTime.getHours()}:${testTime.getMinutes()}`;
  
  const reminder = {
    id: uuidv4(),
    title: 'Test Reminder',
    why: 'Testing',
    time,
    repeat: 'once',
    nextTrigger: 0,
    active: true,
    createdAt: Date.now(),
  };
  
  reminder.nextTrigger = computeNextTrigger(reminder);
  await addReminder(reminder);
}
```

## 🔔 Notifications

### Request Permission

```typescript
import { requestNotificationPermission } from './utils/reminderScheduler';

// On app load
useEffect(() => {
  requestNotificationPermission();
}, []);
```

### Custom Trigger Event

```typescript
// Listen for triggers
useEffect(() => {
  const handler = (e) => {
    const reminder = e.detail;
    // Your logic here
  };
  
  window.addEventListener('reminderTriggered', handler);
  return () => window.removeEventListener('reminderTriggered', handler);
}, []);
```

## 🐛 Debugging

### Check Scheduler Status

```bash
# Console should show:
✅ Reminder scheduler started (checking every 5 seconds)
```

### View Database

1. Open DevTools (F12)
2. Application → IndexedDB → reminder-db → reminders

### Test Trigger

```typescript
// Create reminder for 1 minute from now
createTestReminder();

// Watch console for:
⏰ Reminder due: Test Reminder
🔔 Reminder Triggered: Test Reminder
```

### Common Issues

**Scheduler not starting?**
```typescript
// Ensure hook is called in component
useReminderScheduler({ getAllReminders, updateReminder });
```

**Reminders not triggering?**
```typescript
// Check nextTrigger is set
console.log(reminder.nextTrigger); // Should be timestamp
console.log(new Date(reminder.nextTrigger)); // Should be future date
```

**Database errors?**
```typescript
// Initialize DB first
await initDB();
```

## 📊 Performance Tips

1. **Adjust check interval** based on needs:
   ```typescript
   checkInterval: 10000 // 10 seconds for less frequent checks
   ```

2. **Filter active reminders** before display:
   ```typescript
   const active = await getActiveReminders();
   ```

3. **Limit upcoming reminders**:
   ```typescript
   const next10 = await getUpcomingReminders(10);
   ```

4. **Use indexes** for queries:
   ```typescript
   const sorted = await getRemindersByNextTrigger();
   ```

## 🎯 Next Steps

1. **Setup** → [SETUP.md](./SETUP.md)
2. **Integration** → [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
3. **Examples** → [EXAMPLES.md](./EXAMPLES.md)
4. **Architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)

## 💡 Pro Tips

- Start with simple daily reminders
- Test with 1-minute reminders first
- Monitor console for scheduler messages
- Use DevTools to inspect IndexedDB
- Customize `triggerReminder()` for your needs
- Add error handling for production

---

**Need help?** Check the full documentation in the other .md files!

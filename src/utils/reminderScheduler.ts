/**
 * Real-Time Reminder Scheduling System
 * 
 * This module handles automatic reminder triggering based on scheduled times.
 * All timestamps are stored and compared in UTC to avoid timezone drift.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type RepeatType = "once" | "hourly" | "daily" | "weekly" | "custom";

export interface Reminder {
  id: string;
  title: string;
  why: string;
  message?: string; // Optional message for the reminder
  time: string; // Format: "HH:MM" (e.g., "11:30")
  repeat: RepeatType;
  nextTrigger: number; // UTC timestamp in milliseconds
  active: boolean;
  createdAt: number;
  customInterval?: number; // Optional: for custom repeat (in milliseconds)
  audioRecording?: string; // Optional: base64-encoded audio blob for self-recorded messages
  useCustomAudio?: boolean; // Whether to use custom audio instead of AI TTS
}

// ============================================================================
// CORE SCHEDULING LOGIC
// ============================================================================

/**
 * Computes the next trigger timestamp for a reminder.
 * 
 * @param reminder - The reminder object containing time and repeat settings
 * @returns UTC timestamp (in ms) of the next scheduled occurrence
 * 
 * Logic:
 * 1. Parse the time string into hours/minutes
 * 2. Create a Date object for today at that time
 * 3. If the time has already passed, increment by the repeat interval
 * 4. Return the UTC timestamp
 */
export function computeNextTrigger(reminder: Reminder): number {
  const now = Date.now();
  const [hours, minutes] = reminder.time.split(':').map(Number);

  // Validate time format
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.error(`Invalid time format: ${reminder.time}`);
    return now + 60000; // Default to 1 minute from now if invalid
  }

  // Create a date object for today at the specified time
  const nextDate = new Date();
  nextDate.setHours(hours, minutes, 0, 0);

  let nextTrigger = nextDate.getTime();

  // If the time has already passed today, calculate next occurrence
  if (nextTrigger <= now) {
    switch (reminder.repeat) {
      case "once":
        // For one-time reminders, if time passed, set to tomorrow same time
        nextDate.setDate(nextDate.getDate() + 1);
        nextTrigger = nextDate.getTime();
        break;

      case "hourly":
        // Find the next hour boundary from now
        const hoursToAdd = Math.ceil((now - nextTrigger) / (60 * 60 * 1000));
        nextDate.setHours(nextDate.getHours() + hoursToAdd);
        nextTrigger = nextDate.getTime();
        break;

      case "daily":
        // Set to tomorrow at the same time
        nextDate.setDate(nextDate.getDate() + 1);
        nextTrigger = nextDate.getTime();
        break;

      case "weekly":
        // Set to next week, same day and time
        nextDate.setDate(nextDate.getDate() + 7);
        nextTrigger = nextDate.getTime();
        break;

      case "custom":
        // Use custom interval if provided, otherwise default to daily
        if (reminder.customInterval && reminder.customInterval > 0) {
          const intervalsToAdd = Math.ceil((now - nextTrigger) / reminder.customInterval);
          nextTrigger = nextTrigger + (intervalsToAdd * reminder.customInterval);
        } else {
          nextDate.setDate(nextDate.getDate() + 1);
          nextTrigger = nextDate.getTime();
        }
        break;

      default:
        // Default to daily if unknown repeat type
        nextDate.setDate(nextDate.getDate() + 1);
        nextTrigger = nextDate.getTime();
    }
  }

  return nextTrigger;
}

/**
 * Calculates the next trigger time after a reminder has been triggered.
 * This is used to reschedule recurring reminders.
 * 
 * @param reminder - The reminder that was just triggered
 * @returns UTC timestamp (in ms) of the next occurrence, or null if one-time reminder
 */
export function computeNextRecurrence(reminder: Reminder): number | null {
  // One-time reminders don't recur
  if (reminder.repeat === "once") {
    return null;
  }

  const now = Date.now();
  const currentTrigger = reminder.nextTrigger;

  let nextTrigger: number;

  switch (reminder.repeat) {
    case "hourly":
      // Add 1 hour to the current trigger time
      nextTrigger = currentTrigger + (60 * 60 * 1000);
      break;

    case "daily":
      // Add 1 day to the current trigger time
      nextTrigger = currentTrigger + (24 * 60 * 60 * 1000);
      break;

    case "weekly":
      // Add 7 days to the current trigger time
      nextTrigger = currentTrigger + (7 * 24 * 60 * 60 * 1000);
      break;

    case "custom":
      // Use custom interval if provided
      if (reminder.customInterval && reminder.customInterval > 0) {
        nextTrigger = currentTrigger + reminder.customInterval;
      } else {
        // Default to daily if no custom interval
        nextTrigger = currentTrigger + (24 * 60 * 60 * 1000);
      }
      break;

    default:
      // Default to daily
      nextTrigger = currentTrigger + (24 * 60 * 60 * 1000);
  }

  // Ensure the next trigger is in the future
  // If we're significantly behind (e.g., app was closed), fast-forward
  if (nextTrigger <= now) {
    const updatedReminder = { ...reminder, nextTrigger };
    return computeNextTrigger(updatedReminder);
  }

  return nextTrigger;
}

// ============================================================================
// REMINDER TRIGGERING
// ============================================================================

/**
 * Trigger a reminder (called when reminder is due).
 * This function will be called by the scheduler when a reminder's time has come.
 * 
 * @param reminder - The reminder to trigger
 */
export async function triggerReminder(reminder: Reminder): Promise<void> {
  console.log("🔔 Reminder Triggered:", reminder.title);
  console.log("   Why:", reminder.why);
  console.log("   Time:", reminder.time);
  console.log("   Repeat:", reminder.repeat);

  // Dispatch custom event - this will show the incoming call UI
  // Voice will only play AFTER user answers
  window.dispatchEvent(
    new CustomEvent("reminderTriggered", { detail: reminder })
  );
}

/**
 * Initiate an AI voice call using OpenAI API with TTS (Nigerian voice)
 * This is called ONLY when user answers the call
 */
export async function initiateAIVoiceCall(reminder: Reminder, settings: any): Promise<void> {
  console.log("📞 Initiating AI voice call with Nigerian accent...");

  // OPTIMIZED: Simpler prompt for faster response
  const prompt = `Reminder: ${reminder.title}. ${reminder.why || 'Time to act!'}`;

  try {
    // Step 1: Get AI-generated text - USING GPT-3.5-TURBO FOR SPEED
    const chatResponse = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',  // FASTER than GPT-4 (3-5x speed improvement)
        messages: [
          {
            role: 'system',
            content: 'You are making a quick reminder call. Say "Hello!" then deliver the reminder in 1 brief sentence with Nigerian warmth.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,  // REDUCED from 150 for speed
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      throw new Error(`Chat API failed: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const aiMessage = chatData.choices[0]?.message?.content || '';
    console.log("🤖 AI Message:", aiMessage);

    // Step 2: Convert text to speech using OpenAI TTS
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',  // Fast TTS model
        input: aiMessage,
        voice: 'onyx', // Deep, warm voice - closest to Nigerian accent
        speed: 1.0,  // Normal speed for clarity
      }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`TTS API failed: ${ttsResponse.status}`);
    }

    // Step 3: Play the audio
    const audioBlob = await ttsResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    console.log("🔊 Playing AI voice...");
    
    // Dispatch event when speaking starts
    window.dispatchEvent(new CustomEvent('aiSpeakingStart'));
    
    audio.onended = () => {
      console.log("✅ AI voice finished");
      window.dispatchEvent(new CustomEvent('aiSpeakingEnd'));
      URL.revokeObjectURL(audioUrl);
    };
    
    await audio.play();

  } catch (error) {
    console.error("❌ AI voice call error:", error);
    throw error;
  }
}

// ============================================================================
// SCHEDULER
// ============================================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the reminder scheduler that checks for due reminders every 5 seconds.
 * 
 * @param getAllReminders - Function to fetch all reminders from IndexedDB
 * @param updateReminder - Function to update a reminder in IndexedDB
 * @param checkInterval - How often to check for due reminders (ms), default 5000ms
 * 
 * @returns Function to stop the scheduler
 */
export function startReminderScheduler(
  getAllReminders: () => Promise<Reminder[]>,
  updateReminder: (reminder: Reminder) => Promise<void>,
  checkInterval: number = 5000
): () => void {
  // Clear any existing scheduler
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log("✅ Reminder scheduler started (checking every", checkInterval / 1000, "seconds)");

  // Check immediately on start
  checkReminders();

  // Then check at regular intervals
  schedulerInterval = setInterval(checkReminders, checkInterval);

  async function checkReminders() {
    try {
      const reminders = await getAllReminders();
      const now = Date.now();

      for (const reminder of reminders) {
        // Skip inactive reminders
        if (!reminder.active) {
          continue;
        }

        // Check if reminder is due
        if (now >= reminder.nextTrigger) {
          console.log(`⏰ Reminder due: ${reminder.title} (scheduled for ${new Date(reminder.nextTrigger).toLocaleString()})`);
          
          // Trigger the reminder
          triggerReminder(reminder);

          // Calculate next occurrence
          const nextTrigger = computeNextRecurrence(reminder);

          if (nextTrigger === null) {
            // One-time reminder - deactivate it
            await updateReminder({
              ...reminder,
              active: false,
            });
            console.log(`   ℹ️ One-time reminder deactivated: ${reminder.title}`);
          } else {
            // Recurring reminder - update next trigger time
            await updateReminder({
              ...reminder,
              nextTrigger,
            });
            console.log(`   ℹ️ Next occurrence scheduled for: ${new Date(nextTrigger).toLocaleString()}`);
          }
        }
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  }

  // Return cleanup function
  return () => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log("🛑 Reminder scheduler stopped");
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Returns a human-readable countdown string for a reminder.
 * 
 * @param reminder - The reminder to get countdown for
 * @returns String like "Next reminder in 1h 23m 42s" or "Overdue by 5m"
 */
export function getTimeUntilNextTrigger(reminder: Reminder): string {
  const now = Date.now();
  const diff = reminder.nextTrigger - now;

  // Check if overdue
  if (diff < 0) {
    const overdue = Math.abs(diff);
    return `Overdue by ${formatDuration(overdue)}`;
  }

  // Check if less than 1 minute
  if (diff < 60000) {
    return "Less than 1 minute";
  }

  return `Next reminder in ${formatDuration(diff)}`;
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "1h 23m 42s" or "5m 30s"
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Requests notification permission from the user.
 * Call this when the app initializes or when user enables notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Validates a reminder object before saving.
 * 
 * @param reminder - The reminder to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateReminder(reminder: Partial<Reminder>): { isValid: boolean; error?: string } {
  if (!reminder.title || reminder.title.trim().length === 0) {
    return { isValid: false, error: "Title is required" };
  }

  if (!reminder.time || !/^\d{1,2}:\d{2}$/.test(reminder.time)) {
    return { isValid: false, error: "Invalid time format. Use HH:MM" };
  }

  const [hours, minutes] = reminder.time.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { isValid: false, error: "Time must be between 00:00 and 23:59" };
  }

  if (!reminder.repeat || !["once", "hourly", "daily", "weekly", "custom"].includes(reminder.repeat)) {
    return { isValid: false, error: "Invalid repeat type" };
  }

  if (reminder.repeat === "custom" && (!reminder.customInterval || reminder.customInterval <= 0)) {
    return { isValid: false, error: "Custom repeat requires a positive interval" };
  }

  return { isValid: true };
}

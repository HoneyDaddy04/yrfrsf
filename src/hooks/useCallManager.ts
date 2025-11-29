import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Reminder } from '../utils/reminderScheduler';
import { addCallHistory, updateCallHistory, CallHistoryEntry } from '../db/reminderDB';
import { scheduleRecall, cancelRecall } from '../utils/autoRecall';
import { speakWithBrowser, speakWithOpenAI, generateReminderSpeech } from '../utils/textToSpeech';

export type CallState = 'idle' | 'incoming' | 'active' | 'ended';

export interface MissedCall {
  reminder: Reminder;
  timestamp: number;
}

export function useCallManager() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [currentCallHistory, setCurrentCallHistory] = useState<CallHistoryEntry | null>(null);

  // Use ref to keep track of current call history for event handlers
  const callHistoryRef = useRef<CallHistoryEntry | null>(null);
  // Track the actual start time of the call for accurate duration
  const callStartTimeRef = useRef<number | null>(null);

  // Update ref whenever currentCallHistory changes
  useEffect(() => {
    callHistoryRef.current = currentCallHistory;
  }, [currentCallHistory]);

  useEffect(() => {
    const handleReminderTriggered = async (event: CustomEvent) => {
      const reminder = event.detail as Reminder;
      setCurrentReminder(reminder);
      setCallState('incoming');

      // Get recall attempt number from event
      const recallAttempt = (event.detail as any).recallAttempt || 1;

      // Create initial call history entry
      const callEntry: CallHistoryEntry = {
        id: uuidv4(),
        reminderId: reminder.id,
        reminderTitle: reminder.title,
        reminderWhy: reminder.why || '',
        timestamp: Date.now(),
        answered: false,
        voicePlayed: false,
        recallAttempt,
      };

      await addCallHistory(callEntry);
      setCurrentCallHistory(callEntry);
    };

    const handleSpeakingStart = () => {
      setIsAISpeaking(true);
    };

    const handleSpeakingEnd = async () => {
      setIsAISpeaking(false);
      // Auto-end call after AI finishes speaking - save duration immediately
      setTimeout(async () => {
        const callHistory = callHistoryRef.current;
        const callStartTime = callStartTimeRef.current;

        if (callHistory) {
          const endedAt = Date.now();
          // Use the ref-tracked start time for accurate duration calculation
          const duration = callStartTime
            ? endedAt - callStartTime
            : (callHistory.answeredAt ? endedAt - callHistory.answeredAt : 0);

          console.log('[CallManager] Call ended. Start time:', callStartTime, 'End time:', endedAt, 'Duration:', duration, 'ms');

          const updatedEntry = {
            ...callHistory,
            endedAt,
            duration,
          };
          await updateCallHistory(updatedEntry);
          setCurrentCallHistory(null);
        }

        // Reset the start time ref
        callStartTimeRef.current = null;

        setCallState('ended');
        setTimeout(() => {
          setCallState('idle');
          setCurrentReminder(null);
        }, 1000);
      }, 1000);
    };

    const wrappedHandler = (e: Event) => handleReminderTriggered(e as CustomEvent);
    window.addEventListener('reminderTriggered', wrappedHandler);
    window.addEventListener('aiSpeakingStart', handleSpeakingStart);
    window.addEventListener('aiSpeakingEnd', handleSpeakingEnd);

    return () => {
      window.removeEventListener('reminderTriggered', wrappedHandler);
      window.removeEventListener('aiSpeakingStart', handleSpeakingStart);
      window.removeEventListener('aiSpeakingEnd', handleSpeakingEnd);
    };
  }, []);

  const answerCall = async () => {
    setCallState('active');

    // Record the exact time the call was answered for accurate duration tracking
    const answeredAtTime = Date.now();
    callStartTimeRef.current = answeredAtTime;
    console.log('[CallManager] Call answered at:', answeredAtTime);

    // Cancel any pending recalls for this reminder (user answered!)
    if (currentReminder) {
      cancelRecall(currentReminder.id);
    }

    // Update call history: call answered
    if (currentCallHistory) {
      const updatedEntry = {
        ...currentCallHistory,
        answered: true,
        answeredAt: answeredAtTime,
      };
      await updateCallHistory(updatedEntry);
      setCurrentCallHistory(updatedEntry);
      // Also update the ref immediately for accurate duration tracking
      callHistoryRef.current = updatedEntry;
    }

    // NOW play voice (custom recording or AI TTS)
    if (currentReminder) {
      // Check if there's a custom audio recording
      if (currentReminder.useCustomAudio && currentReminder.audioRecording) {
        try {
          // Play custom audio recording
          window.dispatchEvent(new Event('aiSpeakingStart'));

          const audio = new Audio(currentReminder.audioRecording);
          audio.onended = () => {
            window.dispatchEvent(new Event('aiSpeakingEnd'));
          };
          audio.onerror = () => {
            console.error('❌ Custom audio playback failed');
            window.dispatchEvent(new Event('aiSpeakingEnd'));
          };
          await audio.play();

          // Update call history: voice played successfully
          if (currentCallHistory) {
            const updatedEntry = {
              ...currentCallHistory,
              answered: true,
              answeredAt: currentCallHistory.answeredAt || Date.now(),
              voicePlayed: true,
              voicePlayedSuccessfully: true,
            };
            await updateCallHistory(updatedEntry);
            setCurrentCallHistory(updatedEntry);
          }
        } catch (error) {
          console.error("❌ Custom audio playback failed:", error);

          // Update call history: voice failed
          if (currentCallHistory) {
            const updatedEntry = {
              ...currentCallHistory,
              answered: true,
              answeredAt: currentCallHistory.answeredAt || Date.now(),
              voicePlayed: true,
              voicePlayedSuccessfully: false,
            };
            await updateCallHistory(updatedEntry);
            setCurrentCallHistory(updatedEntry);
          }

          // Still dispatch speaking end event so call doesn't hang
          window.dispatchEvent(new Event('aiSpeakingEnd'));
        }
      } else {
        // Use TTS (browser or OpenAI based on settings)
        let settings = null;
        try {
          const settingsStr = localStorage.getItem('aiReminderSettings');
          settings = settingsStr ? JSON.parse(settingsStr) : null;
        } catch {
          // Use default settings if parse fails
        }
        const speechText = generateReminderSpeech(currentReminder.title, currentReminder.why);

        // Dispatch speaking start event
        window.dispatchEvent(new Event('aiSpeakingStart'));

        try {
          // Check which TTS provider to use
          if (settings?.ttsProvider === 'openai' && settings?.apiKey) {
            // Use OpenAI TTS
            await speakWithOpenAI(speechText, {
              openaiApiKey: settings.apiKey,
              openaiVoice: settings.openaiVoice || 'nova',
            });
          } else {
            // Use Browser TTS (default, free)
            await speakWithBrowser(speechText, {
              browserVoice: settings?.browserVoice,
              browserRate: settings?.browserRate || 1.0,
              browserPitch: settings?.browserPitch || 1.0,
            });
          }

          // Update call history: voice played successfully
          if (currentCallHistory) {
            const updatedEntry = {
              ...currentCallHistory,
              answered: true,
              answeredAt: currentCallHistory.answeredAt || Date.now(),
              voicePlayed: true,
              voicePlayedSuccessfully: true,
            };
            await updateCallHistory(updatedEntry);
            setCurrentCallHistory(updatedEntry);
          }

          // Dispatch speaking end event
          window.dispatchEvent(new Event('aiSpeakingEnd'));
        } catch (error) {
          console.error("❌ TTS failed:", error);

          // Update call history: voice failed
          if (currentCallHistory) {
            const updatedEntry = {
              ...currentCallHistory,
              answered: true,
              answeredAt: currentCallHistory.answeredAt || Date.now(),
              voicePlayed: true,
              voicePlayedSuccessfully: false,
            };
            await updateCallHistory(updatedEntry);
            setCurrentCallHistory(updatedEntry);
          }

          // Dispatch speaking end event even on failure
          window.dispatchEvent(new Event('aiSpeakingEnd'));
        }
      }
    }
  };

  const declineCall = async () => {
    // Update call history: call declined (not answered)
    if (currentCallHistory) {
      const updatedEntry = {
        ...currentCallHistory,
        answered: false,
        endedAt: Date.now(),
        duration: 0,
      };
      await updateCallHistory(updatedEntry);

      // Schedule auto-recall for this declined call
      if (currentReminder) {
        const nextAttempt = (currentCallHistory.recallAttempt || 1) + 1;
        scheduleRecall(currentReminder, nextAttempt, updatedEntry.id);
      }

      setCurrentCallHistory(null);
    }

    // Add to missed calls
    if (currentReminder) {
      const missedCall: MissedCall = {
        reminder: currentReminder,
        timestamp: Date.now(),
      };
      setMissedCalls(prev => [missedCall, ...prev]);

      // Show browser notification for missed call
      if (Notification.permission === "granted") {
        new Notification("Missed Reminder Call", {
          body: `${currentReminder.title} - ${currentReminder.why || 'Tap to view'}`,
          icon: "/favicon.ico",
          tag: `missed-${currentReminder.id}`,
        });
      }
    }

    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCurrentReminder(null);
    }, 1000);
  };

  const hangupCall = async () => {
    // Update call history: call ended with duration
    if (currentCallHistory) {
      const endedAt = Date.now();
      const callStartTime = callStartTimeRef.current;
      // Use the ref-tracked start time for accurate duration calculation
      const duration = callStartTime
        ? endedAt - callStartTime
        : (currentCallHistory.answeredAt ? endedAt - currentCallHistory.answeredAt : 0);

      console.log('[CallManager] Call hung up. Duration:', duration, 'ms');

      const updatedEntry = {
        ...currentCallHistory,
        endedAt,
        duration,
      };
      await updateCallHistory(updatedEntry);
      setCurrentCallHistory(null);
    }

    // Reset the start time ref
    callStartTimeRef.current = null;

    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCurrentReminder(null);
    }, 1000);
  };

  const clearMissedCalls = () => {
    setMissedCalls([]);
  };

  return {
    callState,
    currentReminder,
    isAISpeaking,
    missedCalls,
    currentCallHistory,
    answerCall,
    declineCall,
    hangupCall,
    clearMissedCalls,
  };
}

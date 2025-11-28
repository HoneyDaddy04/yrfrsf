import { useEffect, useState } from 'react';
import { Plus, Clock, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReminderScheduler } from './hooks/useReminderScheduler';
import { useCallManager } from './hooks/useCallManager';
import { useRecallChecker } from './hooks/useRecallChecker';
import { useIncomingCalls } from './hooks/useIncomingCalls';
import { useSupabaseReminderScheduler } from './hooks/useSupabaseReminderScheduler';
import { getAllReminders, updateReminder, initDB, addCompletionPrompt, updateCompletionPrompt } from './db/reminderDB';
import { Reminder, computeNextTrigger } from './utils/reminderScheduler';
import { showCallNotification, stopAllNotifications, requestNotificationPermission } from './utils/notificationUtils';
import ReminderList from './components/ReminderList';
import CreateReminderModal from './components/CreateReminderModal';
import EditReminderModal from './components/EditReminderModal';
import SettingsModal from './components/SettingsModal';
import CallHistoryModal from './components/CallHistoryModal';
import IncomingCallModal from './components/IncomingCallModal';
import ActiveCallModal from './components/ActiveCallModal';
import CompletionPromptModal from './components/CompletionPromptModal';
import Header from './components/Header';
import Stats from './components/Stats';
import InsightsPage from './components/InsightsPage';
import PanicButton from './components/PanicButton';
import ComingSoonModal from './components/ComingSoonModal';
import FeedbackModal from './components/FeedbackModal';
import ReceivedRemindersModal from './components/ReceivedRemindersModal';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'reminders' | 'insights'>('home');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCallHistoryModalOpen, setIsCallHistoryModalOpen] = useState(false);
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isReceivedRemindersModalOpen, setIsReceivedRemindersModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [completionPromptData, setCompletionPromptData] = useState<{ reminder: Reminder; callHistoryId: string } | null>(null);

  // Call manager for phone simulation
  const { callState, currentReminder, isAISpeaking, missedCalls, currentCallHistory, answerCall, declineCall, hangupCall } = useCallManager();

  // Incoming calls from other users (via Supabase real-time)
  const { incomingCall, pendingCalls, answerIncomingCall, declineIncomingCall } = useIncomingCalls();

  // State for handling incoming call from others (used for tracking external call flow)
  const [, setIsHandlingExternalCall] = useState(false);

  // Register service worker for notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('✅ ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.error('❌ ServiceWorker registration failed: ', err);
          });
      });
    }
  }, []);

  // Initialize database and request notification permission
  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        console.log('✅ Database initialized');

        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
        } else {
          console.log('⚠️ Notification permission denied');
        }
      } catch (err) {
        console.error('❌ Initialization error:', err);
      }
    };

    initApp();
  }, []);

  // Start the reminder scheduler
  useReminderScheduler({
    getAllReminders,
    updateReminder,
    checkInterval: 5000,
    enabled: true,
  });

  // Start the recall checker
  useRecallChecker();

  // Start the Supabase reminder scheduler (for reminders sent to others)
  useSupabaseReminderScheduler();

  const handleReminderCreated = () => {
    setIsCreateModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReminderUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Show completion prompt after answered call ends
  useEffect(() => {
    const checkForCompletionPrompt = async () => {
      // If call just ended and was answered, show completion prompt
      if (callState === 'idle' && currentCallHistory && currentCallHistory.answered && currentReminder) {
        // Store data for the prompt
        setCompletionPromptData({
          reminder: currentReminder,
          callHistoryId: currentCallHistory.id,
        });

        // Create completion prompt in database
        await addCompletionPrompt({
          id: `${currentCallHistory.id}-prompt`,
          reminderId: currentReminder.id,
          reminderTitle: currentReminder.title,
          reminderWhy: currentReminder.why || '',
          callHistoryId: currentCallHistory.id,
          promptedAt: Date.now(),
          completed: false,
        });

        // Show the prompt modal after a short delay
        setTimeout(() => {
          setShowCompletionPrompt(true);
        }, 500);
      }
    };

    checkForCompletionPrompt();
  }, [callState, currentCallHistory, currentReminder]);

  const handleCompletionComplete = async () => {
    if (completionPromptData) {
      const promptId = `${completionPromptData.callHistoryId}-prompt`;
      await updateCompletionPrompt(promptId, {
        respondedAt: Date.now(),
        completed: true,
      });
      setShowCompletionPrompt(false);
      setCompletionPromptData(null);
      setRefreshTrigger(prev => prev + 1); // Refresh insights
    }
  };

  const handleCompletionNotComplete = async () => {
    if (completionPromptData) {
      const promptId = `${completionPromptData.callHistoryId}-prompt`;
      await updateCompletionPrompt(promptId, {
        respondedAt: Date.now(),
        completed: false,
      });
      setShowCompletionPrompt(false);
      setCompletionPromptData(null);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleCompletionSkip = async () => {
    if (completionPromptData) {
      const promptId = `${completionPromptData.callHistoryId}-prompt`;
      await updateCompletionPrompt(promptId, {
        skipped: true,
      });
      setShowCompletionPrompt(false);
      setCompletionPromptData(null);
    }
  };

  // Manual check-in handler
  const handleCheckIn = async (reminder: Reminder) => {
    try {
      console.log('Check-in started for:', reminder.title);

      // Check if already checked in for this reminder today
      const { getAllCompletionPrompts } = await import('./db/reminderDB');
      const allPrompts = await getAllCompletionPrompts();

      // Get today's start time (midnight)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      // Check if there's already a check-in for this reminder today
      const existingCheckIn = allPrompts.find(p =>
        p.reminderId === reminder.id &&
        p.completed === true &&
        p.promptedAt >= todayStartMs
      );

      if (existingCheckIn) {
        alert('⚠️ Already Checked In!\n\nYou have already checked in for this reminder today.');
        console.log('❌ Already checked in today');
        return;
      }

      // Create a manual completion prompt entry (without a call)
      const promptId = `manual-${reminder.id}-${Date.now()}`;
      await addCompletionPrompt({
        id: promptId,
        reminderId: reminder.id,
        reminderTitle: reminder.title,
        reminderWhy: reminder.why || '',
        callHistoryId: '', // No call history for manual check-in
        promptedAt: Date.now(),
        completed: true, // Manually marked as complete
      });
      console.log('Completion prompt added');

      await updateCompletionPrompt(promptId, {
        respondedAt: Date.now(),
        completed: true,
      });
      console.log('Completion prompt updated');

      // If reminder was paused, reactivate it and set next trigger
      if (!reminder.active && reminder.repeat !== 'once') {
        console.log('Reactivating paused reminder...');
        const updatedReminder = {
          ...reminder,
          active: true,
          nextTrigger: computeNextTrigger({ ...reminder, active: true }),
        };
        await updateReminder(updatedReminder);
        console.log('Reminder reactivated');
      }

      setRefreshTrigger(prev => prev + 1); // Refresh insights and reminders
      console.log('✅ Check-in successful!');

      // Show success notification
      if (Notification.permission === "granted") {
        new Notification("Checked In! 🎉", {
          body: `${reminder.title} marked as completed${!reminder.active ? ' and reactivated' : ''}`,
          icon: "/favicon.ico",
        });
      } else {
        // Show alert if notifications not granted
        alert(`✅ Checked In! ${reminder.title} marked as completed${!reminder.active ? ' and reactivated' : ''}`);
      }
    } catch (error) {
      console.error('❌ Check-in failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      alert(`Failed to check in: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Handle panic button - trigger immediate motivational call
  const handlePanic = () => {
    console.log('🚨 Panic button activated!');

    // Load panic audio from settings
    const savedSettings = localStorage.getItem('aiReminderSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : null;
    const panicAudio = settings?.panicAudio;

    // Create a special panic reminder
    const panicReminder: Reminder = {
      id: `panic-${Date.now()}`,
      title: 'Emergency Support',
      why: 'You are stronger than this temptation. Remember why you started. You have the power to choose differently right now.',
      time: new Date().toTimeString().slice(0, 5), // Current time
      repeat: 'once',
      nextTrigger: Date.now(),
      active: true,
      createdAt: Date.now(),
      audioRecording: panicAudio,
      useCustomAudio: !!panicAudio,
    };

    // Trigger the reminder event immediately
    window.dispatchEvent(new CustomEvent('reminderTriggered', { detail: panicReminder }));
  };

  // Handle incoming calls with new notification system
  useEffect(() => {
    if (callState === 'incoming' && currentReminder) {
      // Show call notification with ringtone
      showCallNotification(
        'Your Future Self',
        `${currentReminder.title}${currentReminder.why ? ` - ${currentReminder.why}` : ''}`
      );

      // Clean up notifications when component unmounts or call state changes
      return () => {
        stopAllNotifications();
      };
    } else if (callState === 'idle') {
      // Ensure all notifications are cleared when call ends
      stopAllNotifications();
    }
  }, [callState, currentReminder]);

  // Handle page visibility changes to manage notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to the tab, stop any ongoing notifications
        stopAllNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle answering an external incoming call (from another user)
  const handleAnswerExternalCall = async () => {
    const callData = await answerIncomingCall();
    if (callData) {
      setIsHandlingExternalCall(true);

      // Create a virtual reminder from the call data to play audio
      const virtualReminder: Reminder = {
        id: callData.reminder_id || `external-${callData.id}`,
        title: callData.reminder_title,
        why: callData.reminder_why || '',
        time: new Date().toTimeString().slice(0, 5),
        repeat: 'once',
        nextTrigger: callData.triggered_at,
        active: false,
        createdAt: Date.now(),
        audioRecording: callData.audio_recording || undefined,
        useCustomAudio: callData.use_custom_audio || false,
      };

      // Dispatch as a reminder event so call manager handles it
      window.dispatchEvent(new CustomEvent('reminderTriggered', {
        detail: {
          ...virtualReminder,
          isFromOther: true,
          senderName: callData.sender_name,
          senderEmail: callData.sender_email,
        }
      }));
    }
  };

  // Handle declining an external incoming call
  const handleDeclineExternalCall = async () => {
    await declineIncomingCall();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
      {/* Header with Navigation */}
      <Header
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        onCallHistoryClick={() => setIsCallHistoryModalOpen(true)}
        onNewReminderClick={() => setIsCreateModalOpen(true)}
        onReceivedRemindersClick={() => setIsReceivedRemindersModalOpen(true)}
        missedCallsCount={missedCalls.length}
        receivedCallsCount={pendingCalls.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Panic Button - Always visible for emergency support */}
      <PanicButton onPanic={handlePanic} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Hero Section - Simplified */}
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  Your Reminders
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Smart reminders with AI-powered notifications
                </p>
              </div>

              {/* Stats */}
              <Stats refreshTrigger={refreshTrigger} />

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Reminder
                </button>
              </div>

              {/* Recent Reminders Preview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Reminders</h2>
                </div>
                <ReminderList
                  refreshTrigger={refreshTrigger}
                  onReminderUpdated={handleReminderUpdated}
                  onEditReminder={setEditingReminder}
                  onCheckIn={handleCheckIn}
                />
                <div className="px-6 py-3 bg-gray-50 text-right">
                  <button 
                    onClick={() => setActiveTab('reminders')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View all reminders →
                  </button>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'reminders' ? (
            <motion.div
              key="reminders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">My Reminders</h1>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Reminder
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <ReminderList
                  refreshTrigger={refreshTrigger}
                  onReminderUpdated={handleReminderUpdated}
                  onEditReminder={setEditingReminder}
                  onCheckIn={handleCheckIn}
                />
              </div>
            </motion.div>
          ) : activeTab === 'insights' ? (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <InsightsPage />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Create Reminder Modal */}
      {isCreateModalOpen && (
        <CreateReminderModal
          onClose={() => setIsCreateModalOpen(false)}
          onReminderCreated={handleReminderCreated}
        />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {/* Call History Modal */}
      {isCallHistoryModalOpen && (
        <CallHistoryModal
          onClose={() => setIsCallHistoryModalOpen(false)}
        />
      )}

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <EditReminderModal
          reminder={editingReminder}
          onClose={() => setEditingReminder(null)}
          onReminderUpdated={() => {
            setEditingReminder(null);
            handleReminderUpdated();
          }}
        />
      )}

      {/* Incoming Call Modal - Self reminders */}
      {callState === 'incoming' && currentReminder && !incomingCall && (
        <IncomingCallModal
          reminderTitle={currentReminder.title}
          reminderWhy={currentReminder.why}
          recallAttempt={(currentReminder as any).recallAttempt}
          onAnswer={answerCall}
          onDecline={declineCall}
          isFromOther={(currentReminder as any).isFromOther}
          senderName={(currentReminder as any).senderName}
          senderEmail={(currentReminder as any).senderEmail}
        />
      )}

      {/* Incoming Call Modal - From other users (Supabase real-time) */}
      {incomingCall && callState === 'idle' && (
        <IncomingCallModal
          reminderTitle={incomingCall.reminder_title}
          reminderWhy={incomingCall.reminder_why || ''}
          onAnswer={handleAnswerExternalCall}
          onDecline={handleDeclineExternalCall}
          isFromOther={true}
          senderName={incomingCall.sender_name || undefined}
          senderEmail={incomingCall.sender_email || undefined}
        />
      )}

      {/* Active Call Modal */}
      {callState === 'active' && currentReminder && (
        <ActiveCallModal
          reminderTitle={currentReminder.title}
          isAISpeaking={isAISpeaking}
          onHangup={hangupCall}
        />
      )}

      {/* Completion Prompt Modal */}
      {showCompletionPrompt && completionPromptData && (
        <CompletionPromptModal
          reminderTitle={completionPromptData.reminder.title}
          reminderWhy={completionPromptData.reminder.why || ''}
          onComplete={handleCompletionComplete}
          onNotComplete={handleCompletionNotComplete}
          onSkip={handleCompletionSkip}
        />
      )}

      {/* Coming Soon Modal */}
      {isComingSoonModalOpen && (
        <ComingSoonModal onClose={() => setIsComingSoonModalOpen(false)} />
      )}

      {/* Feedback Modal */}
      {isFeedbackModalOpen && (
        <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
      )}

      {/* Received Reminders Modal */}
      {isReceivedRemindersModalOpen && (
        <ReceivedRemindersModal onClose={() => setIsReceivedRemindersModalOpen(false)} />
      )}

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-gray-600 text-sm">
                © 2025 Yrfrsf
              </p>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => setIsComingSoonModalOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Coming Soon
                </button>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Send Feedback
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Real-time scheduling
              </span>
              <span className="flex items-center gap-1">
                <Settings className="w-4 h-4" />
                Fully customizable
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

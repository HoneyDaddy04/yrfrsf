import { useState, useEffect } from 'react';
import { X, Phone, PhoneMissed, Clock, CheckCircle, XCircle, User, Play } from 'lucide-react';
import { getAllCallHistory, CallHistoryEntry, clearAllCallHistory } from '../db/reminderDB';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PendingCall } from '../services/supabaseSync';
import { speakWithBrowser, speakWithOpenAI, generateReminderSpeech } from '../utils/textToSpeech';

type TabType = 'my-calls' | 'received';

interface CallHistoryModalProps {
  onClose: () => void;
  initialTab?: TabType;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date >= yesterday) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export default function CallHistoryModal({ onClose, initialTab = 'my-calls' }: CallHistoryModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  const [receivedCalls, setReceivedCalls] = useState<PendingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    if (user && isSupabaseConfigured) {
      loadReceivedCalls();
    }
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const entries = await getAllCallHistory();
      setHistory(entries);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReceivedCalls = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('pending_calls')
        .select('*')
        .eq('recipient_id', user.id)
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReceivedCalls(data || []);
    } catch (err) {
      console.error('Failed to fetch received calls:', err);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all call history?')) {
      await clearAllCallHistory();
      setHistory([]);
    }
  };

  const playMessage = async (call: PendingCall) => {
    setPlayingId(call.id);
    try {
      if (call.use_custom_audio && call.audio_recording) {
        const audio = new Audio(call.audio_recording);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => setPlayingId(null);
        await audio.play();
      } else {
        const speechText = generateReminderSpeech(call.reminder_title, call.reminder_why || '');
        const settingsStr = localStorage.getItem('aiReminderSettings');
        let settings = null;
        try {
          settings = settingsStr ? JSON.parse(settingsStr) : null;
        } catch {
          // ignore
        }

        if (settings?.ttsProvider === 'openai' && settings?.apiKey) {
          await speakWithOpenAI(speechText, {
            openaiApiKey: settings.apiKey,
            openaiVoice: settings.openaiVoice || 'nova',
          });
        } else {
          await speakWithBrowser(speechText, {
            browserVoice: settings?.browserVoice,
            browserRate: settings?.browserRate || 1.0,
            browserPitch: settings?.browserPitch || 1.0,
          });
        }
        setPlayingId(null);
      }
    } catch (err) {
      console.error('Failed to play message:', err);
      setPlayingId(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins > 0 ? `${diffMins}m ago` : 'Just now';
  };

  const answeredCalls = history.filter(h => h.answered);
  const missedCalls = history.filter(h => !h.answered);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Call History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {activeTab === 'my-calls'
                ? `${history.length} total calls • ${answeredCalls.length} answered • ${missedCalls.length} missed`
                : `${receivedCalls.length} received reminders`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('my-calls')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'my-calls'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            My Calls
            {missedCalls.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {missedCalls.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            From Others
            {receivedCalls.filter(c => c.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full">
                {receivedCalls.filter(c => c.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {activeTab === 'my-calls' ? (
            // My Calls Tab
            loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-600 mt-4">Loading call history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No call history yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Call history will appear here when reminders trigger
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      entry.answered
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : 'border-red-200 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-full ${
                            entry.answered ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        >
                          {entry.answered ? (
                            <Phone className="w-5 h-5 text-white" />
                          ) : (
                            <PhoneMissed className="w-5 h-5 text-white" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {entry.reminderTitle}
                          </h3>
                          {entry.reminderWhy && (
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.reminderWhy}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(entry.timestamp)}
                            </span>

                            {entry.answered && entry.duration !== undefined && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Duration: {formatDuration(entry.duration)}
                              </span>
                            )}

                            {entry.voicePlayed && (
                              <span className="flex items-center gap-1">
                                {entry.voicePlayedSuccessfully ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    <span className="text-green-700">Voice played</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-red-600" />
                                    <span className="text-red-700">Voice failed</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          entry.answered
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {entry.answered ? 'Answered' : 'Missed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Received Calls Tab
            receivedCalls.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No received reminders</p>
                <p className="text-gray-500 text-sm mt-2">
                  When someone sends you a reminder, it will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      call.status === 'answered'
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : call.status === 'pending'
                          ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {call.sender_name || 'Someone'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-800">
                            {call.reminder_title}
                          </h3>
                          {call.reminder_why && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {call.reminder_why}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(call.triggered_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playMessage(call)}
                          disabled={playingId === call.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            playingId === call.id
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {playingId === call.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" />
                              Playing
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Play
                            </>
                          )}
                        </button>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            call.status === 'answered'
                              ? 'bg-green-200 text-green-800'
                              : call.status === 'pending'
                                ? 'bg-indigo-200 text-indigo-800'
                                : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Close
          </button>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
            >
              Clear All History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

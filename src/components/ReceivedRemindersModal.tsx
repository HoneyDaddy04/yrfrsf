import { useState, useEffect } from 'react';
import { X, Play, Phone, User, Clock, Check, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PendingCall } from '../services/supabaseSync';
import { speakWithBrowser, speakWithOpenAI, generateReminderSpeech } from '../utils/textToSpeech';

interface ReceivedRemindersModalProps {
  onClose: () => void;
}

export default function ReceivedRemindersModal({ onClose }: ReceivedRemindersModalProps) {
  const { user } = useAuth();
  const [calls, setCalls] = useState<PendingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const fetchCalls = async () => {
      try {
        const { data, error } = await supabase
          .from('pending_calls')
          .select('*')
          .eq('recipient_id', user.id)
          .order('triggered_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setCalls(data || []);
      } catch (err) {
        console.error('Failed to fetch received calls:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [user]);

  const playMessage = async (call: PendingCall) => {
    setPlayingId(call.id);

    try {
      // Check if there's custom audio
      if (call.use_custom_audio && call.audio_recording) {
        const audio = new Audio(call.audio_recording);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          console.error('Audio playback failed');
          setPlayingId(null);
        };
        await audio.play();
      } else {
        // Use TTS
        const speechText = generateReminderSpeech(call.reminder_title, call.reminder_why || '');
        const settingsStr = localStorage.getItem('aiReminderSettings');
        let settings = null;
        try {
          settings = settingsStr ? JSON.parse(settingsStr) : null;
        } catch (e) {
          console.error('Failed to parse settings:', e);
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins > 0 ? `${diffMins}m ago` : 'Just now';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'missed':
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Phone className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'answered':
        return 'Answered';
      case 'missed':
        return 'Missed';
      case 'expired':
        return 'Expired';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Received Reminders</h2>
              <p className="text-sm text-gray-500">Calls from others</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No received reminders</h3>
              <p className="text-sm text-gray-500">
                When someone sends you a reminder, it will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => (
                <div key={call.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Sender Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {call.sender_name || 'Someone'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          {getStatusIcon(call.status)}
                          {getStatusText(call.status)}
                        </span>
                      </div>

                      <h4 className="font-medium text-gray-800 mb-1">
                        {call.reminder_title}
                      </h4>

                      {call.reminder_why && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {call.reminder_why}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {formatTime(call.triggered_at)}
                        </span>

                        {/* Play Button */}
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
                              Playing...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Play
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

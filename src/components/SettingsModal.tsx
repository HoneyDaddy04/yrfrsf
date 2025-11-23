import { useState, useEffect } from 'react';
import { X, Save, Key, Volume2, Bell, Music, Phone, AlertCircle } from 'lucide-react';
import { AVAILABLE_RINGTONES, type RingtoneType, generateRingtone } from '../utils/ringtones';
import AudioRecorder from './AudioRecorder';

interface SettingsModalProps {
  onClose: () => void;
}

interface Settings {
  apiKey: string;
  apiEndpoint: string;
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  ringtone: RingtoneType;
  autoRecallEnabled: boolean;
  maxRecallAttempts: number;
  panicAudio?: string;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    voiceEnabled: true,
    notificationsEnabled: true,
    ringtone: 'chimes',
    autoRecallEnabled: true,
    maxRecallAttempts: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('aiReminderSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);

    // Save to localStorage
    localStorage.setItem('aiReminderSettings', JSON.stringify(settings));

    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    }, 500);
  };

  const handlePreviewRingtone = async (ringtoneType: RingtoneType) => {
    if (isPlayingPreview) return;

    setIsPlayingPreview(true);
    try {
      // @ts-ignore - webkitAudioContext for Safari
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();

      const buffer = generateRingtone(audioContext, ringtoneType);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      source.onended = () => {
        setIsPlayingPreview(false);
      };

      source.start();

      // Auto stop after 2 seconds
      setTimeout(() => {
        source.stop();
        setIsPlayingPreview(false);
      }, 2000);
    } catch (error) {
      console.error('Error playing ringtone preview:', error);
      setIsPlayingPreview(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">AI Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {saved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              ✅ Settings saved successfully!
            </div>
          )}

          {/* API Key Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Key className="w-5 h-5 text-primary-600" />
              <span>OpenAI API Configuration</span>
            </div>

            {/* API Key */}
            <div>
              <label className="label">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="sk-..."
                className="input font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>

            {/* API Endpoint */}
            <div>
              <label className="label">API Endpoint</label>
              <input
                type="text"
                value={settings.apiEndpoint}
                onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
                className="input font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                Default OpenAI endpoint. Change if using a proxy or different provider.
              </p>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Volume2 className="w-5 h-5 text-primary-600" />
              <span>Voice Call Settings</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Enable AI Voice Calls</p>
                <p className="text-sm text-gray-600">
                  Trigger AI voice call when reminder is due
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.voiceEnabled}
                  onChange={(e) => setSettings({ ...settings, voiceEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Bell className="w-5 h-5 text-primary-600" />
              <span>Notification Settings</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Browser Notifications</p>
                <p className="text-sm text-gray-600">
                  Show desktop notifications when reminders trigger
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Auto-Recall Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Phone className="w-5 h-5 text-primary-600" />
              <span>Auto-Recall Settings</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Enable Auto-Recall</p>
                <p className="text-sm text-gray-600">
                  Keep calling until you answer
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRecallEnabled}
                  onChange={(e) => setSettings({ ...settings, autoRecallEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {settings.autoRecallEnabled && (
              <div>
                <label className="label">Max Recall Attempts (0 = unlimited)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.maxRecallAttempts}
                  onChange={(e) => setSettings({ ...settings, maxRecallAttempts: parseInt(e.target.value) || 0 })}
                  className="input"
                />
                <p className="mt-2 text-xs text-gray-500">
                  How many times to call again if you miss/decline. Set to 0 for unlimited attempts.
                </p>
              </div>
            )}
          </div>

          {/* Ringtone Selection */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Music className="w-5 h-5 text-primary-600" />
              <span>Ringtone Selection</span>
            </div>

            <div className="space-y-2">
              {AVAILABLE_RINGTONES.map((ringtone) => (
                <div
                  key={ringtone.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    settings.ringtone === ringtone.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setSettings({ ...settings, ringtone: ringtone.id })}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      settings.ringtone === ringtone.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {settings.ringtone === ringtone.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{ringtone.name}</p>
                      <p className="text-xs text-gray-600">{ringtone.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewRingtone(ringtone.id);
                    }}
                    disabled={isPlayingPreview}
                    className="px-3 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlayingPreview ? 'Playing...' : 'Preview'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Panic Button Custom Message */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Panic Button Message</span>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800 mb-4">
                Record a personal message that will play when you activate the panic button. This could be words of encouragement, reminders of your goals, or anything that helps you stay strong in moments of temptation.
              </p>

              <AudioRecorder
                onRecordingComplete={(audio) => setSettings({ ...settings, panicAudio: audio })}
                existingRecording={settings.panicAudio}
                onClearRecording={() => setSettings({ ...settings, panicAudio: undefined })}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> When a reminder triggers, the app will use your OpenAI API key to initiate an AI voice call. The AI will speak your reminder title and description.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            disabled={isSaving || !settings.apiKey}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

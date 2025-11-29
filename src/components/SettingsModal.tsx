import { useState, useEffect } from 'react';
import { X, Save, Key, Volume2, Bell, Music, Phone, AlertCircle, Mic, Play, Download, Upload, LogOut, User, Beaker } from 'lucide-react';
import { AVAILABLE_RINGTONES, type RingtoneType, generateRingtone } from '../utils/ringtones';
import { getBrowserVoices, OPENAI_VOICES, previewVoice, type TTSProvider, type BrowserVoice } from '../utils/textToSpeech';
import { exportAllData, importData, type ExportData } from '../db/reminderDB';
import AudioRecorder from './AudioRecorder';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

interface BetaFeatures {
  partners: boolean;
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
  // TTS Settings
  ttsProvider: TTSProvider;
  browserVoice?: string;
  browserRate: number;
  browserPitch: number;
  openaiVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  // Beta Features
  betaFeatures?: BetaFeatures;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/audio/speech',
    voiceEnabled: true,
    notificationsEnabled: true,
    ringtone: 'reflection',
    autoRecallEnabled: true,
    maxRecallAttempts: 0,
    ttsProvider: 'browser',
    browserRate: 1.0,
    browserPitch: 1.0,
    openaiVoice: 'nova',
    betaFeatures: {
      partners: false,
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<BrowserVoice[]>([]);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'voice' | 'data' | 'account'>('general');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out? Your local data will be cleared.')) {
      return;
    }

    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await signOut();
      onClose();
      // Page will redirect to login via auth state change
    } catch (error) {
      console.error('Logout failed:', error);
      setLogoutError('Failed to sign out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem('aiReminderSettings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch {
      // Use default settings if parse fails
    }

    // Load browser voices
    getBrowserVoices().then(setBrowserVoices);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
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
      source.onended = () => setIsPlayingPreview(false);
      source.start();
      setTimeout(() => {
        source.stop();
        setIsPlayingPreview(false);
      }, 2000);
    } catch (error) {
      console.error('Error playing ringtone preview:', error);
      setIsPlayingPreview(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (isPreviewingVoice) return;
    setIsPreviewingVoice(true);
    try {
      await previewVoice({
        provider: settings.ttsProvider,
        browserVoice: settings.browserVoice,
        browserRate: settings.browserRate,
        browserPitch: settings.browserPitch,
        openaiApiKey: settings.apiKey,
        openaiVoice: settings.openaiVoice,
      });
    } catch (error) {
      console.error('Error previewing voice:', error);
      alert('Failed to preview voice. ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yfs-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);
      await importData(data);
      setImportStatus('Data imported successfully! Refresh the page to see changes.');
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('Failed to import data. Please check the file format.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs - properly sized for all screens */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          {[
            { id: 'general' as const, label: 'General', icon: Bell },
            { id: 'voice' as const, label: 'Voice', icon: Mic },
            { id: 'data' as const, label: 'Data', icon: Download },
            ...(isSupabaseConfigured ? [{ id: 'account' as const, label: 'Account', icon: User }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {saved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              Settings saved successfully!
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              {/* Notification Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <span>Notifications</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Browser Notifications</p>
                    <p className="text-sm text-gray-600">Show desktop notifications when reminders trigger</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Voice Calls</p>
                    <p className="text-sm text-gray-600">Enable AI voice call simulation</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.voiceEnabled}
                      onChange={(e) => setSettings({ ...settings, voiceEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Auto-Recall Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Phone className="w-5 h-5 text-indigo-600" />
                  <span>Auto-Recall</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Enable Auto-Recall</p>
                    <p className="text-sm text-gray-600">Keep calling until you answer</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoRecallEnabled}
                      onChange={(e) => setSettings({ ...settings, autoRecallEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {settings.autoRecallEnabled && (
                  <div>
                    <label htmlFor="max-recall-attempts" className="block text-sm font-medium text-gray-700 mb-2">
                      Max Recall Attempts
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="max-recall-attempts"
                        type="number"
                        min="0"
                        max="10"
                        value={settings.maxRecallAttempts}
                        onChange={(e) => setSettings({ ...settings, maxRecallAttempts: parseInt(e.target.value) || 0 })}
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-600">
                        {settings.maxRecallAttempts === 0 ? '(Unlimited)' : `attempt${settings.maxRecallAttempts !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ringtone Selection */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Music className="w-5 h-5 text-indigo-600" />
                  <span>Ringtone</span>
                </div>

                <div className="space-y-2">
                  {AVAILABLE_RINGTONES.map((ringtone) => (
                    <div
                      key={ringtone.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        settings.ringtone === ringtone.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => setSettings({ ...settings, ringtone: ringtone.id })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          settings.ringtone === ringtone.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                        }`}>
                          {settings.ringtone === ringtone.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{ringtone.name}</p>
                          <p className="text-xs text-gray-600">{ringtone.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePreviewRingtone(ringtone.id); }}
                        disabled={isPlayingPreview}
                        className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isPlayingPreview ? 'Playing...' : 'Preview'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beta Features */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Beaker className="w-5 h-5 text-purple-600" />
                  <span>Beta Features</span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Experimental</span>
                </div>

                <p className="text-sm text-gray-600">
                  These features are still in development. Enable them to try them out early.
                </p>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div>
                    <p className="font-medium text-gray-900">Accountability Partners</p>
                    <p className="text-sm text-gray-600">Connect with friends who get notified when you miss reminders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.betaFeatures?.partners || false}
                      onChange={(e) => setSettings({
                        ...settings,
                        betaFeatures: { ...settings.betaFeatures, partners: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Voice & Audio Tab */}
          {activeTab === 'voice' && (
            <>
              {/* TTS Provider Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                  <span>Voice Provider</span>
                </div>

                <div className="space-y-2">
                  {/* Browser TTS */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.ttsProvider === 'browser'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => setSettings({ ...settings, ttsProvider: 'browser' })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settings.ttsProvider === 'browser' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                      }`}>
                        {settings.ttsProvider === 'browser' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Browser Voice (Free)</p>
                        <p className="text-xs text-gray-600">Uses your device's built-in text-to-speech</p>
                      </div>
                    </div>
                  </div>

                  {/* OpenAI TTS */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.ttsProvider === 'openai'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => setSettings({ ...settings, ttsProvider: 'openai' })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settings.ttsProvider === 'openai' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                      }`}>
                        {settings.ttsProvider === 'openai' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">OpenAI TTS (Premium)</p>
                        <p className="text-xs text-gray-600">High-quality natural voices (requires API key)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Browser Voice Settings */}
              {settings.ttsProvider === 'browser' && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900">Browser Voice Settings</h3>

                  <div>
                    <label htmlFor="browser-voice" className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
                    <select
                      id="browser-voice"
                      value={settings.browserVoice || ''}
                      onChange={(e) => setSettings({ ...settings, browserVoice: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">System Default</option>
                      {browserVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="browser-rate" className="block text-sm font-medium text-gray-700 mb-2">
                      Speed: {settings.browserRate.toFixed(1)}x
                    </label>
                    <input
                      id="browser-rate"
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.browserRate}
                      onChange={(e) => setSettings({ ...settings, browserRate: parseFloat(e.target.value) })}
                      className="w-full"
                      aria-valuemin={0.5}
                      aria-valuemax={2}
                      aria-valuenow={settings.browserRate}
                    />
                  </div>

                  <div>
                    <label htmlFor="browser-pitch" className="block text-sm font-medium text-gray-700 mb-2">
                      Pitch: {settings.browserPitch.toFixed(1)}
                    </label>
                    <input
                      id="browser-pitch"
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.browserPitch}
                      onChange={(e) => setSettings({ ...settings, browserPitch: parseFloat(e.target.value) })}
                      className="w-full"
                      aria-valuemin={0.5}
                      aria-valuemax={2}
                      aria-valuenow={settings.browserPitch}
                    />
                  </div>
                </div>
              )}

              {/* OpenAI TTS Settings */}
              {settings.ttsProvider === 'openai' && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900">OpenAI Voice Settings</h3>

                  <div>
                    <label htmlFor="openai-api-key" className="block text-sm font-medium text-gray-700 mb-2">
                      API Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="openai-api-key"
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      autoComplete="off"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Get your API key from{' '}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        OpenAI Platform
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
                    <div className="grid grid-cols-2 gap-2">
                      {OPENAI_VOICES.map((voice) => (
                        <div
                          key={voice.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            settings.openaiVoice === voice.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                          onClick={() => setSettings({ ...settings, openaiVoice: voice.id })}
                        >
                          <p className="font-medium text-gray-900">{voice.name}</p>
                          <p className="text-xs text-gray-600">{voice.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handlePreviewVoice}
                  disabled={isPreviewingVoice || (settings.ttsProvider === 'openai' && !settings.apiKey)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={settings.ttsProvider === 'openai' && !settings.apiKey ? 'Enter your API key above to preview' : 'Preview voice'}
                  aria-label={isPreviewingVoice ? 'Playing preview' : 'Preview voice'}
                >
                  <Play className="w-5 h-5" />
                  {isPreviewingVoice ? 'Playing...' : 'Preview Voice'}
                </button>
                {settings.ttsProvider === 'openai' && !settings.apiKey && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Enter your API key above to enable preview
                  </p>
                )}
              </div>

              {/* Panic Button Audio */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span>Panic Button Message</span>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 mb-4">
                    Record a personal message that will play when you activate the panic button.
                  </p>
                  <AudioRecorder
                    onRecordingComplete={(audio) => setSettings({ ...settings, panicAudio: audio })}
                    existingRecording={settings.panicAudio}
                    onClearRecording={() => setSettings({ ...settings, panicAudio: undefined })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Data & Backup Tab */}
          {activeTab === 'data' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Download className="w-5 h-5 text-indigo-600" />
                  <span>Backup & Restore</span>
                </div>

                <p className="text-sm text-gray-600">
                  Export your data to a file for backup, or import data from a previous backup.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Export Data
                  </button>

                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5" />
                    Import Data
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>

                {importStatus && (
                  <div className={`p-4 rounded-lg ${importStatus.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {importStatus}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Key className="w-5 h-5 text-indigo-600" />
                  <span>Data Privacy</span>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Your data stays local.</strong> All your reminders, settings, and history are stored only on your device using IndexedDB. We never send your personal data to any server.
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>API Key Security:</strong> If you use OpenAI TTS, your API key is stored locally and only used for direct communication with OpenAI's servers. It never passes through our servers.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && isSupabaseConfigured && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>Account Information</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900 break-all">{user?.email || 'Not available'}</p>
                  </div>
                  {user?.user_metadata?.full_name && (
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      {/* Sanitize user metadata to prevent XSS */}
                      <p className="font-medium text-gray-900 break-words">
                        {String(user.user_metadata.full_name).slice(0, 100)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Account Created</p>
                    <p className="font-medium text-gray-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <LogOut className="w-5 h-5 text-red-600" />
                  <span>Sign Out</span>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 mb-4">
                    Signing out will clear all local data from this device. Your account will remain active, but you'll need to sign in again to access your reminders.
                  </p>

                  {logoutError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
                      {logoutError}
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" />
                        Sign Out
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            disabled={isSaving}
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

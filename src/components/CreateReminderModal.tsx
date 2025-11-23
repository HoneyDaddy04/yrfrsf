import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { addReminder } from '../db/reminderDB';
import { computeNextTrigger, validateReminder, RepeatType } from '../utils/reminderScheduler';
import AudioRecorder from './AudioRecorder';

interface CreateReminderModalProps {
  onClose: () => void;
  onReminderCreated: () => void;
}

export default function CreateReminderModal({ onClose, onReminderCreated }: CreateReminderModalProps) {
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<RepeatType>('daily');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioRecording, setAudioRecording] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const reminder = {
        id: uuidv4(),
        title,
        why,
        time,
        repeat,
        nextTrigger: 0,
        active: true,
        createdAt: Date.now(),
        audioRecording,
        useCustomAudio: !!audioRecording,
      };

      // Validate
      const validation = validateReminder(reminder);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid reminder');
        setIsSubmitting(false);
        return;
      }

      // Compute next trigger
      reminder.nextTrigger = computeNextTrigger(reminder);

      // Save
      await addReminder(reminder);

      console.log('✅ Reminder created:', reminder.title);
      console.log('📅 Next trigger:', new Date(reminder.nextTrigger).toLocaleString());

      onReminderCreated();
    } catch (err) {
      console.error('Failed to create reminder:', err);
      setError('Failed to create reminder. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Reminder</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="label">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Workout"
              className="input"
              required
              autoFocus
            />
          </div>

          {/* Why */}
          <div>
            <label className="label">Why is this important?</label>
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="e.g., Start my day with energy and focus"
              className="input min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          {/* Audio Recorder */}
          <AudioRecorder
            onRecordingComplete={setAudioRecording}
            existingRecording={audioRecording}
            onClearRecording={() => setAudioRecording(undefined)}
          />

          {/* Time */}
          <div>
            <label className="label">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Select when you want to be reminded
            </p>
          </div>

          {/* Repeat */}
          <div>
            <label className="label">
              Repeat <span className="text-red-500">*</span>
            </label>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as RepeatType)}
              className="input"
              required
            >
              <option value="once">Once</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {repeat === 'once' && 'Reminder will trigger once and then deactivate'}
              {repeat === 'hourly' && 'Reminder will trigger every hour'}
              {repeat === 'daily' && 'Reminder will trigger at the same time every day'}
              {repeat === 'weekly' && 'Reminder will trigger at the same time every week'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Create Reminder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

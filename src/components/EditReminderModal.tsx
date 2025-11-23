import { useState } from 'react';
import { X, Save, Clock, Repeat } from 'lucide-react';
import { Reminder, RepeatType, computeNextTrigger } from '../utils/reminderScheduler';
import { updateReminder } from '../db/reminderDB';

interface EditReminderModalProps {
  reminder: Reminder;
  onClose: () => void;
  onReminderUpdated: () => void;
}

export default function EditReminderModal({
  reminder,
  onClose,
  onReminderUpdated,
}: EditReminderModalProps) {
  const [title, setTitle] = useState(reminder.title);
  const [why, setWhy] = useState(reminder.why);
  const [time, setTime] = useState(reminder.time);
  const [repeat, setRepeat] = useState<RepeatType>(reminder.repeat);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!time) {
      setError('Time is required');
      return;
    }

    setIsLoading(true);

    try {
      // Create updated reminder with new values
      const updatedReminder: Reminder = {
        ...reminder,
        title: title.trim(),
        why: why.trim(),
        time,
        repeat,
      };

      // Auto-activate if changed to recurring from "once" or if past reminder is now recurring
      if (repeat !== 'once') {
        updatedReminder.active = true;
      }

      // Calculate new next trigger time
      const nextTrigger = computeNextTrigger(updatedReminder);
      updatedReminder.nextTrigger = nextTrigger;

      await updateReminder(updatedReminder);
      onReminderUpdated();
      onClose();
    } catch (err) {
      setError('Failed to update reminder. Please try again.');
      console.error('Update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Reminder</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
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
            />
          </div>

          {/* Why */}
          <div>
            <label className="label">Why (Optional)</label>
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="e.g., Start your day with energy"
              className="input min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          {/* Time */}
          <div>
            <label className="label">
              Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current time will be used to calculate next trigger
            </p>
          </div>

          {/* Repeat */}
          <div>
            <label className="label">Repeat Pattern</label>
            <div className="relative">
              <Repeat className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatType)}
                className="input pl-10"
              >
                <option value="once">Once</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Updating the time will recalculate when this reminder triggers next.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Clock, Repeat, Trash2, Edit, Play, Pause, Calendar, CheckCircle } from 'lucide-react';
import { Reminder, computeNextTrigger } from '../utils/reminderScheduler';
import { updateReminder, deleteReminder } from '../db/reminderDB';
import { useReminderCountdown } from '../hooks/useReminderCountdown';

interface ReminderCardProps {
  reminder: Reminder;
  onUpdate: () => void;
  onEdit: (reminder: Reminder) => void;
  onCheckIn?: (reminder: Reminder) => void;
  viewMode?: 'grid' | 'list';
}

export default function ReminderCard({ reminder, onUpdate, onEdit, onCheckIn, viewMode = 'grid' }: ReminderCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const countdown = useReminderCountdown(reminder);

  const handleToggleActive = async () => {
    try {
      const updated = { ...reminder, active: !reminder.active };
      
      // Recalculate next trigger if reactivating
      if (updated.active) {
        updated.nextTrigger = computeNextTrigger(updated);
      }
      
      await updateReminder(updated);
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle reminder:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${reminder.title}"?`)) return;
    
    try {
      setIsDeleting(true);
      await deleteReminder(reminder.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      setIsDeleting(false);
    }
  };

  const getRepeatBadgeColor = (repeat: string) => {
    switch (repeat) {
      case 'once': return 'bg-gray-100 text-gray-700';
      case 'hourly': return 'bg-blue-100 text-blue-700';
      case 'daily': return 'bg-green-100 text-green-700';
      case 'weekly': return 'bg-purple-100 text-purple-700';
      default: return 'bg-orange-100 text-orange-700';
    }
  };

  const isOverdue = reminder.active && reminder.nextTrigger < Date.now();

  // List view rendering
  if (viewMode === 'list') {
    return (
      <div className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all hover:shadow-md ${!reminder.active ? 'opacity-60' : ''} ${isOverdue ? 'border-l-4 border-red-500' : 'border-gray-200'}`}>
        {/* Left: Reminder info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{reminder.title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRepeatBadgeColor(reminder.repeat)}`}>
              {reminder.repeat}
            </span>
            {reminder.active && !isOverdue && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Active
              </span>
            )}
            {!reminder.active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                Paused
              </span>
            )}
            {isOverdue && reminder.active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                Overdue
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{reminder.time}</span>
            </div>
            {reminder.active && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="truncate">{countdown}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-4">
          {onCheckIn && (
            <button
              onClick={() => onCheckIn(reminder)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Check In"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleToggleActive}
            className={`p-2 rounded-lg transition-colors ${
              reminder.active
                ? 'text-yellow-600 hover:bg-yellow-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={reminder.active ? 'Pause' : 'Resume'}
          >
            {reminder.active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onEdit(reminder)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid view rendering (original)
  return (
    <div className={`card hover:shadow-lg transition-all duration-200 ${!reminder.active ? 'opacity-60' : ''} ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {reminder.title}
          </h3>
          {reminder.why && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {reminder.why}
            </p>
          )}
        </div>
        
        {/* Status Badge */}
        {reminder.active && !isOverdue && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Active
          </span>
        )}
        {!reminder.active && (
          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
            Paused
          </span>
        )}
        {isOverdue && reminder.active && (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            Overdue
          </span>
        )}
      </div>

      {/* Time Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="font-medium">{reminder.time}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Repeat className="w-4 h-4 text-gray-400" />
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRepeatBadgeColor(reminder.repeat)}`}>
            {reminder.repeat}
          </span>
        </div>

        {reminder.active && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{countdown}</span>
          </div>
        )}
      </div>

      {/* Next Trigger */}
      <div className="text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
        Next: {new Date(reminder.nextTrigger).toLocaleString()}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Check In Button - ALWAYS show, even for paused reminders */}
        {onCheckIn && (
          <button
            onClick={() => onCheckIn(reminder)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
            title="Mark as completed and reactivate"
          >
            <CheckCircle className="w-4 h-4" />
            Check In {!reminder.active && '& Resume'}
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              reminder.active
                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
            title={reminder.active ? 'Pause reminder' : 'Resume reminder'}
          >
            {reminder.active ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Resume
              </>
            )}
          </button>

          <button
            onClick={() => onEdit(reminder)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit reminder"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete reminder"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

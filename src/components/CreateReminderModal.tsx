import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, Users, Plus, Trash2, UsersRound } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { addReminder } from '../db/reminderDB';
import { computeNextTrigger, validateReminder, RepeatType } from '../utils/reminderScheduler';
import AudioRecorder from './AudioRecorder';
import UserSearch from './UserSearch';
import { useAuth } from '../contexts/AuthContext';
import { saveReminderToSupabase, UserProfile } from '../services/supabaseSync';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CreateReminderModalProps {
  onClose: () => void;
  onReminderCreated: () => void;
}

type RecipientType = 'self' | 'someone' | 'group';
type CustomRepeatType = 'every_x_hours' | 'specific_times' | 'specific_days';

interface ReminderGroup {
  id: string;
  name: string;
  member_count: number;
}

// Get current time formatted as HH:MM
const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function CreateReminderModal({ onClose, onReminderCreated }: CreateReminderModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [time, setTime] = useState(() => getCurrentTime());
  const [repeat, setRepeat] = useState<RepeatType>('daily');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioRecording, setAudioRecording] = useState<string | undefined>(undefined);
  const [recipientType, setRecipientType] = useState<RecipientType>('self');
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);

  // Custom repeat options
  const [customRepeatType, setCustomRepeatType] = useState<CustomRepeatType>('every_x_hours');
  const [everyXHours, setEveryXHours] = useState(2);
  const [specificTimes, setSpecificTimes] = useState<string[]>(() => [getCurrentTime()]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

  // Groups
  const [groups, setGroups] = useState<ReminderGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ReminderGroup | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // Fetch user's groups when "group" is selected
  useEffect(() => {
    if (recipientType === 'group' && user && isSupabaseConfigured) {
      fetchGroups();
    }
  }, [recipientType, user]);

  const fetchGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    setGroupsError(null);

    // Timeout after 10 seconds
    const timeoutId = setTimeout(() => {
      setLoadingGroups(false);
      setGroupsError('Loading groups timed out. Please try again.');
    }, 10000);

    try {
      // Get groups where user is a member
      const { data: membershipData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      clearTimeout(timeoutId);

      if (memberError) throw memberError;

      if (!membershipData || membershipData.length === 0) {
        setGroups([]);
        setLoadingGroups(false);
        return;
      }

      const groupIds = membershipData.map((m) => m.group_id);

      const { data: groupsData, error: groupsError } = await supabase
        .from('reminder_groups')
        .select('id, name, member_count')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      setGroups(groupsData || []);
    } catch {
      clearTimeout(timeoutId);
      setGroupsError('Failed to load groups. Please try again.');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate recipient selection
    if (recipientType === 'someone' && !selectedRecipient) {
      setError('Please select a recipient for the reminder');
      setIsSubmitting(false);
      return;
    }

    if (recipientType === 'group' && !selectedGroup) {
      setError('Please select a group for the reminder');
      setIsSubmitting(false);
      return;
    }

    try {
      // Build custom interval for custom repeat types
      let customInterval: number | undefined;
      let daysOfWeek: number[] | undefined;
      let times: string[] | undefined;

      if (repeat === 'custom') {
        if (customRepeatType === 'every_x_hours') {
          // Validate hours range
          if (everyXHours < 1 || everyXHours > 23) {
            setError('Hours must be between 1 and 23');
            setIsSubmitting(false);
            return;
          }
          customInterval = everyXHours * 60 * 60 * 1000; // Convert hours to ms
        } else if (customRepeatType === 'specific_times') {
          // Validate at least one time is set
          const validTimes = specificTimes.filter(t => t && t.trim() !== '');
          if (validTimes.length === 0) {
            setError('Please add at least one time for the reminder');
            setIsSubmitting(false);
            return;
          }
          times = validTimes;
        } else if (customRepeatType === 'specific_days') {
          // Validate at least one day is selected
          if (selectedDays.length === 0) {
            setError('Please select at least one day for the reminder');
            setIsSubmitting(false);
            return;
          }
          daysOfWeek = selectedDays;
        }
      }

      // Sanitize inputs
      const sanitizedTitle = title.trim().slice(0, 200);
      const sanitizedWhy = why.trim().slice(0, 500);

      if (!sanitizedTitle) {
        setError('Title cannot be empty');
        setIsSubmitting(false);
        return;
      }

      const reminder = {
        id: uuidv4(),
        title: sanitizedTitle,
        why: sanitizedWhy,
        time: repeat === 'custom' && customRepeatType === 'specific_times' ? specificTimes[0] : time,
        repeat,
        nextTrigger: 0,
        active: true,
        createdAt: Date.now(),
        audioRecording,
        useCustomAudio: !!audioRecording,
        customInterval,
        daysOfWeek,
        specificTimes: times,
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

      const isForSelf = recipientType === 'self';
      const isForGroup = recipientType === 'group';

      if (isForSelf) {
        // Save locally for self reminders
        await addReminder(reminder);
      }

      if (isForGroup && selectedGroup && user && isSupabaseConfigured) {
        // Save to group_reminders table
        const { error: groupError } = await supabase.from('group_reminders').insert({
          group_id: selectedGroup.id,
          title: reminder.title,
          why: reminder.why || null,
          time: reminder.time,
          repeat: reminder.repeat,
          next_trigger: reminder.nextTrigger,
          active: true,
          created_by: user.id,
        });

        if (groupError) {
          setError('Failed to create group reminder. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else if (!isForGroup) {
        // Sync to Supabase (for both self and others)
        if (user) {
          const senderName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone';
          await saveReminderToSupabase(
            reminder,
            user.id,
            isForSelf ? undefined : selectedRecipient?.id,
            isForSelf ? undefined : selectedRecipient?.email || undefined,
            isForSelf ? undefined : senderName
          ).catch(() => {
            // Ignore sync errors - don't fail the whole operation
          });
        }
      }

      onReminderCreated();
    } catch {
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

          {/* Recipient Type Toggle */}
          <div>
            <label className="label">Who is this reminder for?</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('self');
                  setSelectedRecipient(null);
                  setSelectedGroup(null);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  recipientType === 'self'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="font-medium text-sm">Myself</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipientType('someone');
                  setSelectedGroup(null);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  recipientType === 'someone'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm">Someone</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipientType('group');
                  setSelectedRecipient(null);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  recipientType === 'group'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <UsersRound className="w-4 h-4" />
                <span className="font-medium text-sm">Group</span>
              </button>
            </div>
          </div>

          {/* Recipient Search (only shown when "Someone Else" is selected) */}
          {recipientType === 'someone' && (
            <div>
              <label className="label">
                Find recipient <span className="text-red-500">*</span>
              </label>
              <UserSearch
                onSelectUser={setSelectedRecipient}
                selectedUser={selectedRecipient}
                allowInvite={true}
              />
              <p className="mt-2 text-xs text-gray-500">
                The person must have an account to receive reminder calls
              </p>
            </div>
          )}

          {/* Group Selection (only shown when "Group" is selected) */}
          {recipientType === 'group' && (
            <div>
              <label className="label">
                Select group <span className="text-red-500">*</span>
              </label>
              {groupsError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                  <p className="text-sm text-red-700 mb-2">{groupsError}</p>
                  <button
                    type="button"
                    onClick={fetchGroups}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Try again
                  </button>
                </div>
              ) : loadingGroups ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Loading groups...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <UsersRound className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">You're not a member of any groups yet.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Go to the Groups tab to create or join a group.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedGroup?.id || ''}
                    onChange={(e) => {
                      const group = groups.find((g) => g.id === e.target.value);
                      setSelectedGroup(group || null);
                    }}
                    className="input"
                  >
                    <option value="">Select a group...</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.member_count} member{group.member_count !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    All group members will receive this reminder
                  </p>
                </>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="reminder-title" className="label">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="reminder-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Workout"
              className="input"
              required
              autoFocus
              maxLength={200}
            />
          </div>

          {/* Why */}
          <div>
            <label htmlFor="reminder-why" className="label">Why is this important?</label>
            <textarea
              id="reminder-why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="e.g., Start my day with energy and focus"
              className="input min-h-[100px] resize-none"
              rows={3}
              maxLength={500}
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
            <label htmlFor="reminder-time" className="label">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
              required
              aria-describedby="time-hint"
            />
            <p id="time-hint" className="mt-1 text-xs text-gray-500">
              Select when you want to be reminded
            </p>
          </div>

          {/* Repeat */}
          <div>
            <label htmlFor="reminder-repeat" className="label">
              Repeat <span className="text-red-500">*</span>
            </label>
            <select
              id="reminder-repeat"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as RepeatType)}
              className="input"
              required
            >
              <option value="once">Once</option>
              <option value="hourly">Every Hour</option>
              <option value="daily">Every Day</option>
              <option value="weekly">Every Week</option>
              <option value="custom">Custom...</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {repeat === 'once' && 'Reminder will trigger once and then deactivate'}
              {repeat === 'hourly' && 'Reminder will trigger every hour starting from the time above'}
              {repeat === 'daily' && 'Reminder will trigger at the same time every day'}
              {repeat === 'weekly' && 'Reminder will trigger at the same time every week'}
              {repeat === 'custom' && 'Customize when this reminder repeats'}
            </p>
          </div>

          {/* Custom Repeat Options */}
          {repeat === 'custom' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="label text-sm">Custom Repeat Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomRepeatType('every_x_hours')}
                    className={`p-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      customRepeatType === 'every_x_hours'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    Every X Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRepeatType('specific_times')}
                    className={`p-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      customRepeatType === 'specific_times'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    Specific Times
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRepeatType('specific_days')}
                    className={`p-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      customRepeatType === 'specific_days'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    Specific Days
                  </button>
                </div>
              </div>

              {/* Every X Hours */}
              {customRepeatType === 'every_x_hours' && (
                <div>
                  <label className="label text-sm">Repeat every</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="23"
                      value={everyXHours}
                      onChange={(e) => setEveryXHours(parseInt(e.target.value) || 1)}
                      className="input w-20 text-center"
                    />
                    <span className="text-gray-600">hours</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Starting from {time}, then every {everyXHours} hour{everyXHours > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Specific Times */}
              {customRepeatType === 'specific_times' && (
                <div>
                  <label className="label text-sm">Times to remind</label>
                  <div className="space-y-2">
                    {specificTimes.map((t, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={t}
                          onChange={(e) => {
                            const newTimes = [...specificTimes];
                            newTimes[index] = e.target.value;
                            setSpecificTimes(newTimes);
                          }}
                          className="input flex-1"
                        />
                        {specificTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSpecificTimes(specificTimes.filter((_, i) => i !== index));
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {specificTimes.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setSpecificTimes([...specificTimes, getCurrentTime()])}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add another time
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Reminder will trigger at each of these times daily
                  </p>
                </div>
              )}

              {/* Specific Days */}
              {customRepeatType === 'specific_days' && (
                <div>
                  <label className="label text-sm">Days to remind</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          if (selectedDays.includes(day.value)) {
                            if (selectedDays.length > 1) {
                              setSelectedDays(selectedDays.filter((d) => d !== day.value));
                            }
                          } else {
                            setSelectedDays([...selectedDays, day.value].sort());
                          }
                        }}
                        className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                          selectedDays.includes(day.value)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Reminder will trigger at {time} on selected days
                  </p>
                </div>
              )}
            </div>
          )}

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

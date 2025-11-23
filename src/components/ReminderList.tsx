import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, Inbox, RefreshCw, CheckCircle, Grid3x3, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllReminders } from '../db/reminderDB';
import { Reminder } from '../utils/reminderScheduler';
import ReminderCard from './ReminderCard';

interface ReminderListProps {
  refreshTrigger: number;
  onReminderUpdated: () => void;
  onEditReminder: (reminder: Reminder) => void;
  onCheckIn?: (reminder: Reminder) => void;
}

export default function ReminderList({ refreshTrigger, onReminderUpdated, onEditReminder, onCheckIn }: ReminderListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullToRefresh, setPullToRefresh] = useState({ active: false, startY: 0, distance: 0 });
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const listRef = useRef<HTMLDivElement>(null);

  const loadReminders = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      const all = await getAllReminders();
      
      // Sort by nextTrigger (soonest first)
      const sorted = all.sort((a, b) => a.nextTrigger - b.nextTrigger);
      setReminders(sorted);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setError('Failed to load reminders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullToRefresh(prev => ({ ...prev, active: false, distance: 0 }));
    }
  }, [refreshing]);

  // Initial load and refresh trigger
  useEffect(() => {
    loadReminders();
  }, [loadReminders, refreshTrigger]);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      setPullToRefresh({
        active: true,
        startY: e.touches[0].clientY,
        distance: 0
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullToRefresh.active) return;
    
    const y = e.touches[0].clientY;
    const distance = Math.max(0, (y - pullToRefresh.startY) / 2);
    
    if (distance > 0) {
      setPullToRefresh(prev => ({
        ...prev,
        distance: Math.min(distance, 100)
      }));
    }
  };

  const handleTouchEnd = () => {
    if (pullToRefresh.distance > 50) {
      setRefreshing(true);
      loadReminders();
    } else {
      setPullToRefresh(prev => ({ ...prev, active: false, distance: 0 }));
    }
  };

  if (loading && !refreshing) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center py-16 md:py-24"
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your reminders...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-4"
      >
        <div className="flex items-start gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Couldn't load reminders</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={loadReminders}
              className="mt-3 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (reminders.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center"
      >
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-10 h-10 text-indigo-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No reminders yet</h3>
        <p className="text-gray-600 mb-6">
          Create your first reminder to get started!
        </p>
        <button
          onClick={() => onEditReminder({ 
            id: '', 
            title: '', 
            message: '', 
            time: new Date().getTime(),
            nextTrigger: 0,
            frequency: 'once',
            active: true
          })}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Create Reminder
        </button>
      </motion.div>
    );
  }

  return (
    <div 
      ref={listRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="flex justify-center items-center py-2 overflow-hidden transition-all duration-300"
        style={{
          height: `${pullToRefresh.distance}px`,
          opacity: Math.min(1, pullToRefresh.distance / 50)
        }}
      >
        {refreshing ? (
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
        ) : (
          <RefreshCw 
            className="w-5 h-5 text-indigo-400 transition-transform duration-200"
            style={{
              transform: `rotate(${Math.min(180, pullToRefresh.distance * 1.8)}deg)`
            }}
          />
        )}
      </div>

      {/* Last refreshed time */}
      {lastRefreshed && (
        <div className="flex justify-end items-center mb-3 px-1">
          <span className="text-xs text-gray-400 flex items-center">
            {refreshing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                Updated {lastRefreshed.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-xl font-bold text-gray-900">
          Your Reminders <span className="text-indigo-600">({reminders.length})</span>
        </h2>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Grid view"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}>
        {reminders.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            onUpdate={onReminderUpdated}
            onEdit={onEditReminder}
            onCheckIn={onCheckIn}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}

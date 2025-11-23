import { useState, useEffect } from 'react';
import { X, Phone, PhoneMissed, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getAllCallHistory, CallHistoryEntry, clearAllCallHistory } from '../db/reminderDB';

interface CallHistoryModalProps {
  onClose: () => void;
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

export default function CallHistoryModal({ onClose }: CallHistoryModalProps) {
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

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

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all call history?')) {
      await clearAllCallHistory();
      setHistory([]);
    }
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
              {history.length} total calls • {answeredCalls.length} answered • {missedCalls.length} missed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
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

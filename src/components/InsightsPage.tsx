import { useState, useEffect } from 'react';
import { TrendingUp, Phone, CheckCircle, Clock, Target, Award, BarChart3 } from 'lucide-react';
import {
  getAllCallHistory,
  getAllCompletionPrompts,
  type CallHistoryEntry,
  type CompletionPrompt,
} from '../db/reminderDB';

type TimeRange = 'today' | 'week' | 'month' | 'all';

export default function InsightsPage() {
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [completionPrompts, setCompletionPrompts] = useState<CompletionPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [calls, prompts] = await Promise.all([
        getAllCallHistory(),
        getAllCompletionPrompts(),
      ]);
      setCallHistory(calls);
      setCompletionPrompts(prompts);
    } catch (error) {
      console.error('Failed to load insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get time range boundaries
  const getTimeRangeBoundary = (range: TimeRange): number => {
    const now = new Date();
    switch (range) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return todayStart.getTime();
      case 'week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekStart.getTime();
      case 'month':
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return monthStart.getTime();
      case 'all':
      default:
        return 0;
    }
  };

  const timeRangeBoundary = getTimeRangeBoundary(timeRange);

  // Filter data based on time range
  const filteredCallHistory = callHistory.filter(c => c.timestamp >= timeRangeBoundary);
  const filteredCompletionPrompts = completionPrompts.filter(p => p.promptedAt >= timeRangeBoundary);

  // Calculate statistics
  const stats = {
    totalCalls: filteredCallHistory.length,
    answeredCalls: filteredCallHistory.filter(c => c.answered).length,
    missedCalls: filteredCallHistory.filter(c => !c.answered).length,
    // For completion, count prompts that user responded to (completed OR skipped with response)
    totalPrompts: filteredCompletionPrompts.filter(p => p.respondedAt).length,
    completedTasks: filteredCompletionPrompts.filter(p => p.completed).length,
    recallAttempts: filteredCallHistory.filter(c => (c.recallAttempt || 1) > 1).length,
  };

  // Answer rate based on actual calls
  const answerRate = stats.totalCalls > 0
    ? Math.min(100, Math.round((stats.answeredCalls / stats.totalCalls) * 100))
    : 0;

  // Completion rate - if no prompts yet, use answer rate as proxy
  // This prevents 0% completion when user just started
  const completionRate = stats.totalPrompts > 0
    ? Math.min(100, Math.round((stats.completedTasks / stats.totalPrompts) * 100))
    : (stats.answeredCalls > 0 ? 50 : 0); // Give partial credit if answering calls but no check-ins yet

  // Discipline score calculation:
  // - If user has both calls and prompts, average them
  // - If user only has calls (no check-ins yet), use answer rate with slight penalty
  // - This rewards users for answering calls even before completing check-ins
  let disciplineScore: number;
  if (stats.totalPrompts > 0) {
    disciplineScore = Math.min(100, Math.round((answerRate + completionRate) / 2));
  } else if (stats.totalCalls > 0) {
    // No check-ins yet, but has answered calls - give credit based on answer rate
    disciplineScore = Math.min(100, Math.round(answerRate * 0.7)); // 70% weight for just answering
  } else {
    disciplineScore = 0;
  }

  // Average call duration
  const durationsMs = filteredCallHistory
    .filter(c => c.duration && c.duration > 0)
    .map(c => c.duration!);
  const avgDurationMs = durationsMs.length > 0
    ? durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length
    : 0;
  const avgDurationSec = Math.round(avgDurationMs / 1000);

  // Get score color and label
  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent' };
    if (score >= 60) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good' };
    if (score >= 40) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Needs Work' };
  };

  const scoreStyle = getScoreColor(disciplineScore);

  // Get time range label
  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  // Calculate daily breakdown for trend visualization
  const getDailyBreakdown = () => {
    const days: { date: string; score: number; calls: number; answered: number }[] = [];
    const numDays = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'today' ? 1 : 0;

    if (numDays === 0) return days;

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayCalls = callHistory.filter(c => c.timestamp >= dayStart && c.timestamp < dayEnd);
      const dayPrompts = completionPrompts.filter(p => p.promptedAt >= dayStart && p.promptedAt < dayEnd && p.respondedAt);

      const dayAnswered = dayCalls.filter(c => c.answered).length;
      const dayCompleted = dayPrompts.filter(p => p.completed).length;

      const dayAnswerRate = dayCalls.length > 0 ? Math.round((dayAnswered / dayCalls.length) * 100) : 0;
      const dayCompletionRate = dayPrompts.length > 0 ? Math.round((dayCompleted / dayPrompts.length) * 100) : 0;

      // Calculate day score - reward answering even without check-ins
      let dayScore: number;
      if (dayPrompts.length > 0) {
        dayScore = Math.round((dayAnswerRate + dayCompletionRate) / 2);
      } else if (dayCalls.length > 0) {
        dayScore = Math.round(dayAnswerRate * 0.7);
      } else {
        dayScore = 0;
      }

      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: dayScore,
        calls: dayCalls.length,
        answered: dayAnswered,
      });
    }

    return days;
  };

  const dailyBreakdown = getDailyBreakdown();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (stats.totalCalls === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
        <p className="text-gray-600">
          Start answering reminder calls to see your insights and track your discipline!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Insights</h1>
        <p className="text-gray-600">Track your accountability and build better habits</p>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {(['today', 'week', 'month', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {getTimeRangeLabel(range)}
            </button>
          ))}
        </div>
      </div>

      {/* Discipline Score - Compact Hero Section */}
      <div className={`${scoreStyle.bg} rounded-xl p-4 sm:p-6 text-center shadow-sm`}>
        <div className="flex items-center justify-center gap-3">
          <Award className={`w-8 h-8 ${scoreStyle.color}`} />
          <div className="text-left">
            <h2 className="text-sm font-semibold text-gray-700">Discipline Score</h2>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${scoreStyle.color}`}>{disciplineScore}%</span>
              <span className={`text-sm font-medium ${scoreStyle.color}`}>{scoreStyle.label}</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {stats.totalCalls} calls · {stats.totalPrompts} check-ins
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Answer Rate */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Phone className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{answerRate}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Answer Rate</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.answeredCalls} of {stats.totalCalls} calls
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{completionRate}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Completion Rate</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.completedTasks} of {stats.totalPrompts} tasks
          </p>
        </div>

        {/* Average Duration */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">{avgDurationSec}s</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Avg Call Time</p>
          <p className="text-xs text-gray-500 mt-1">
            {durationsMs.length} calls tracked
          </p>
        </div>

        {/* Recall Attempts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Target className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.recallAttempts}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Recall Attempts</p>
          <p className="text-xs text-gray-500 mt-1">
            Calls you initially missed
          </p>
        </div>
      </div>

      {/* Daily Trend Line Graph - Show for Week/Month */}
      {(timeRange === 'week' || timeRange === 'month') && dailyBreakdown.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {timeRange === 'week' ? 'Discipline Trend (7 Days)' : 'Discipline Trend (30 Days)'}
            </h3>
          </div>

          {/* Line Chart */}
          <div className="relative h-64 mb-4">
            <svg className="w-full h-full" viewBox="0 0 800 256" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={256 - (y * 256) / 100}
                  x2="800"
                  y2={256 - (y * 256) / 100}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}

              {/* Area under the line */}
              <defs>
                <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {dailyBreakdown.length > 1 && (
                <>
                  {/* Area path */}
                  <path
                    d={`M 0 256 ${dailyBreakdown
                      .map((day, i) => {
                        const x = (i / (dailyBreakdown.length - 1)) * 800;
                        const y = 256 - (day.score * 256) / 100;
                        return `L ${x} ${y}`;
                      })
                      .join(' ')} L 800 256 Z`}
                    fill="url(#scoreGradient)"
                  />

                  {/* Line path */}
                  <path
                    d={dailyBreakdown
                      .map((day, i) => {
                        const x = (i / (dailyBreakdown.length - 1)) * 800;
                        const y = 256 - (day.score * 256) / 100;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data points */}
                  {dailyBreakdown.map((day, i) => {
                    const x = (i / (dailyBreakdown.length - 1)) * 800;
                    const y = 256 - (day.score * 256) / 100;
                    // Score style available if needed: getScoreColor(day.score)
                    return (
                      <g key={i}>
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="white"
                          stroke="#6366f1"
                          strokeWidth="3"
                        />
                        {day.score > 0 && (
                          <circle
                            cx={x}
                            cy={y}
                            r="8"
                            fill="transparent"
                            className="hover:fill-indigo-100 cursor-pointer transition-all"
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              )}
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-8">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-500 px-2">
            {dailyBreakdown.map((day, i) => {
              // Show every 2nd label for week, every 5th for month
              const showLabel = timeRange === 'week' ? i % 2 === 0 : i % 5 === 0 || i === dailyBreakdown.length - 1;
              return (
                <span key={i} className={showLabel ? '' : 'invisible'}>
                  {day.date}
                </span>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-gray-600">Discipline Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
              <span className="text-gray-600">No Data</span>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{stats.answeredCalls}</span>
              <span className="text-xs text-gray-500">({answerRate}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Missed/Declined</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{stats.missedCalls}</span>
              <span className="text-xs text-gray-500">({100 - answerRate}%)</span>
            </div>
          </div>
        </div>

        {/* Simple Progress Bar */}
        <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
            style={{ width: `${answerRate}%` }}
          ></div>
        </div>
      </div>

      {/* Tips Based on Score */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {disciplineScore >= 80 ? '🎉 Amazing Work!' : disciplineScore >= 60 ? '👍 Keep Going!' : '💪 Room for Improvement'}
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          {disciplineScore >= 80 ? (
            <>
              <p>• You're crushing it! Your discipline is top-notch.</p>
              <p>• Keep maintaining this consistency to build lasting habits.</p>
            </>
          ) : disciplineScore >= 60 ? (
            <>
              <p>• You're on the right track! Try answering more calls.</p>
              <p>• Follow through on tasks after answering to boost completion rate.</p>
            </>
          ) : (
            <>
              <p>• Don't give up! Start by answering every call that comes in.</p>
              <p>• Set reminders for important tasks and commit to completing them.</p>
              <p>• Consistency is key - small improvements compound over time.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

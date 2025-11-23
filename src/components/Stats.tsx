import { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { getDBStats } from '../db/reminderDB';

interface StatsProps {
  refreshTrigger: number;
}

export default function Stats({ refreshTrigger }: StatsProps) {
  const [stats, setStats] = useState({
    totalReminders: 0,
    activeReminders: 0,
    upcomingReminders: 0,
    overdueReminders: 0,
  });

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    try {
      const dbStats = await getDBStats();
      setStats(dbStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const statCards = [
    {
      label: 'Total Reminders',
      value: stats.totalReminders,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active',
      value: stats.activeReminders,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Upcoming',
      value: stats.upcomingReminders,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Overdue',
      value: stats.overdueReminders,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="card hover:shadow-md transition-shadow animate-slide-up"
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

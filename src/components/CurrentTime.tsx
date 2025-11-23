import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-fade-in">
      <div className="flex items-center justify-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 font-mono">
            {formatTime(currentTime)}
          </p>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {formatDate(currentTime)}
          </p>
        </div>
      </div>
    </div>
  );
}

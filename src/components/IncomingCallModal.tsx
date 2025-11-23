import { Phone, PhoneOff, User } from 'lucide-react';
import { useState, useEffect } from 'react';

interface IncomingCallModalProps {
  reminderTitle: string;
  reminderWhy: string;
  recallAttempt?: number;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  reminderTitle,
  reminderWhy,
  recallAttempt = 1,
  onAnswer,
  onDecline,
}: IncomingCallModalProps) {
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    // Play ringtone
    const audio = new Audio('/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(err => console.log('Ringtone play failed:', err));

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm space-y-6">
        {/* Caller Info - Compact */}
        <div className="flex flex-col items-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-3 ${isRinging ? 'animate-pulse' : ''}`}>
            <User className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-white text-xl font-bold mb-1">
            Your Future Self
            {recallAttempt > 1 && (
              <span className="ml-2 text-sm text-yellow-400">
                (Attempt #{recallAttempt})
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-sm">
            {recallAttempt > 1 ? `Calling again...` : 'Incoming call...'}
          </p>

          {/* Ringing Animation */}
          {isRinging && (
            <div className="flex gap-2 mt-3">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>

        {/* Reminder Details - Compact */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 w-full max-h-32 overflow-y-auto">
          <p className="text-white text-base font-semibold mb-1 text-center break-words">{reminderTitle}</p>
          {reminderWhy && (
            <p className="text-gray-300 text-xs text-center break-words line-clamp-3">{reminderWhy}</p>
          )}
        </div>

        {/* Call Actions - Compact */}
        <div className="flex gap-8 justify-center">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 group-active:scale-95">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Decline</span>
          </button>

          {/* Answer Button */}
          <button
            onClick={() => {
              setIsRinging(false);
              onAnswer();
            }}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 group-active:scale-95 animate-pulse">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

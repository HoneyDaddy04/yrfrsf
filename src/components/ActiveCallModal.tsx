import { PhoneOff, Volume2, Mic, MicOff } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ActiveCallModalProps {
  reminderTitle: string;
  isAISpeaking: boolean;
  onHangup: () => void;
}

export default function ActiveCallModal({
  reminderTitle,
  isAISpeaking,
  onHangup,
}: ActiveCallModalProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Call Info - Compact */}
        <div className="flex flex-col items-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-3 ${isAISpeaking ? 'animate-pulse' : ''}`}>
            <Volume2 className={`w-10 h-10 text-white ${isAISpeaking ? 'animate-bounce' : ''}`} />
          </div>

          <h2 className="text-white text-xl font-bold mb-1">AI Reminder</h2>
          <p className="text-green-400 text-sm font-medium mb-1">Connected</p>
          <p className="text-gray-400 text-base">{formatDuration(callDuration)}</p>
        </div>

        {/* Reminder Title */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 w-full">
          <p className="text-white text-base font-semibold text-center break-words">{reminderTitle}</p>
          {isAISpeaking && (
            <div className="flex justify-center gap-1 mt-3">
              <div className="w-1 h-6 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-8 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
              <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-7 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              <div className="w-1 h-6 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
          )}
        </div>

        {/* Call Controls - Compact */}
        <div className="flex gap-6 justify-center">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-12 h-12 rounded-full ${isMuted ? 'bg-gray-600' : 'bg-gray-700'} flex items-center justify-center shadow-lg`}>
              {isMuted ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-white text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Hangup Button */}
          <button
            onClick={onHangup}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110 active:scale-95">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">End Call</span>
          </button>

          {/* Speaker Button */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center shadow-lg">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-[10px]">Speaker</span>
          </button>
        </div>
      </div>
    </div>
  );
}

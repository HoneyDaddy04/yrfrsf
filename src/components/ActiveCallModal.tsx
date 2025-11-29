import { PhoneOff, Volume2, Mic, MicOff, Waves } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
  const [isSpeaker, setIsSpeaker] = useState(true);

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

  // Audio wave bars for speaking animation
  const waveBars = [
    { height: 24, delay: 0 },
    { height: 32, delay: 0.1 },
    { height: 40, delay: 0.2 },
    { height: 32, delay: 0.3 },
    { height: 24, delay: 0.4 },
    { height: 36, delay: 0.5 },
    { height: 28, delay: 0.6 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-4 overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900">
        {/* Animated circles */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
          />
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-sm space-y-6 z-10"
      >
        {/* Call Info */}
        <div className="flex flex-col items-center">
          {/* Avatar with audio visualization */}
          <div className="relative mb-4">
            {/* Pulsing ring when speaking */}
            {isAISpeaking && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.15, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(16, 185, 129, 0.4)',
                    '0 0 0 20px rgba(16, 185, 129, 0)',
                    '0 0 0 0 rgba(16, 185, 129, 0)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            {/* Avatar */}
            <motion.div
              animate={isAISpeaking ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
              {isAISpeaking ? (
                <Waves className="w-12 h-12 text-white drop-shadow-lg" />
              ) : (
                <Volume2 className="w-12 h-12 text-white drop-shadow-lg" />
              )}
            </motion.div>
          </div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-2xl font-bold mb-1"
          >
            AI Reminder
          </motion.h2>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-1"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
            <span className="text-green-400 text-sm font-medium">Connected</span>
          </motion.div>

          {/* Duration */}
          <motion.p
            className="text-gray-300 text-xl font-mono tracking-wider"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {formatDuration(callDuration)}
          </motion.p>
        </div>

        {/* Reminder Title Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5 w-full"
        >
          <p className="text-white text-lg font-semibold text-center break-words mb-3">
            {reminderTitle}
          </p>

          {/* Audio visualization */}
          {isAISpeaking && (
            <div className="flex justify-center items-end gap-1 h-12 pt-2">
              {waveBars.map((bar, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-full"
                  animate={{
                    height: [bar.height * 0.3, bar.height, bar.height * 0.5, bar.height * 0.8, bar.height * 0.3],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: bar.delay,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          {!isAISpeaking && (
            <div className="flex justify-center items-center gap-1.5 h-12 pt-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-3 bg-gray-600 rounded-full"
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Call Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-6 justify-center"
        >
          {/* Mute Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMuted(!isMuted)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isMuted
                ? 'bg-red-500/20 border-2 border-red-500/50'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}>
              {isMuted ? (
                <MicOff className="w-6 h-6 text-red-400" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </div>
            <span className={`text-xs ${isMuted ? 'text-red-400' : 'text-gray-400'}`}>
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </motion.button>

          {/* Hangup Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onHangup}
            className="flex flex-col items-center gap-1.5"
          >
            <motion.div
              whileHover={{ rotate: 135 }}
              transition={{ duration: 0.2 }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </motion.div>
            <span className="text-xs text-gray-400 font-medium">End Call</span>
          </motion.button>

          {/* Speaker Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSpeaker(!isSpeaker)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isSpeaker
                ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}>
              <Volume2 className={`w-6 h-6 ${isSpeaker ? 'text-emerald-400' : 'text-white'}`} />
            </div>
            <span className={`text-xs ${isSpeaker ? 'text-emerald-400' : 'text-gray-400'}`}>
              Speaker
            </span>
          </motion.button>
        </motion.div>

        {/* Speaking indicator text */}
        {isAISpeaking && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-emerald-400 text-sm"
          >
            Your future self is speaking...
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

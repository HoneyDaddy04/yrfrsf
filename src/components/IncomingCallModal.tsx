import { Phone, PhoneOff, User, Clock, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../utils/logger';

interface IncomingCallModalProps {
  reminderTitle: string;
  reminderWhy: string;
  recallAttempt?: number;
  onAnswer: () => void;
  onDecline: () => void;
  onSnooze?: (minutes: number) => void;
  // Optional: for calls from other users
  senderName?: string;
  senderEmail?: string;
  isFromOther?: boolean;
}

// Snooze options in minutes
const SNOOZE_OPTIONS = [5, 10, 15, 30];

export default function IncomingCallModal({
  reminderTitle,
  reminderWhy,
  recallAttempt = 1,
  onAnswer,
  onDecline,
  onSnooze,
  senderName,
  senderEmail,
  isFromOther = false,
}: IncomingCallModalProps) {
  const [isRinging, setIsRinging] = useState(true);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play ringtone - use ref to properly manage audio lifecycle
    const audio = new Audio('/ringtone.mp3');
    audioRef.current = audio;
    audio.loop = true;
    audio.play().catch((error) => {
      logger.warn('Failed to play ringtone:', error);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const handleSnooze = (minutes: number) => {
    if (onSnooze) {
      onSnooze(minutes);
    }
    setShowSnoozeOptions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-4 overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900">
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 10,
              }}
              animate={{
                y: -10,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-sm space-y-6 z-10"
      >
        {/* Caller Info */}
        <div className="flex flex-col items-center">
          {/* Avatar with ripple effect */}
          <div className="relative mb-4">
            {/* Ripple rings */}
            {isRinging && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-green-400/50"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-green-400/30"
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-green-400/20"
                  initial={{ scale: 1, opacity: 0.2 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 1 }}
                />
              </>
            )}

            {/* Avatar */}
            <motion.div
              animate={isRinging ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
              className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${
                isFromOther
                  ? 'from-pink-500 via-purple-500 to-indigo-500'
                  : 'from-emerald-400 via-cyan-500 to-blue-500'
              } flex items-center justify-center shadow-2xl shadow-green-500/30`}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
              <User className="w-12 h-12 text-white drop-shadow-lg" />
            </motion.div>
          </div>

          {/* Caller name */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-2xl font-bold mb-1 text-center"
          >
            {isFromOther ? (senderName || 'Someone') : 'Your Future Self'}
          </motion.h2>

          {/* Recall attempt badge */}
          {!isFromOther && recallAttempt > 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full mb-2"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 text-xs font-medium">
                Attempt #{recallAttempt}
              </span>
            </motion.div>
          )}

          {isFromOther && senderEmail && (
            <p className="text-gray-400 text-xs mb-2">{senderEmail}</p>
          )}

          {/* Status text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 text-gray-300"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 10, -10, 5, -5, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
            >
              <Phone className="w-4 h-4 text-green-400" />
            </motion.div>
            <span className="text-sm">
              {isFromOther
                ? 'is sending you a reminder...'
                : recallAttempt > 1
                  ? 'Calling again...'
                  : 'Incoming call...'}
            </span>
          </motion.div>

          {/* Ringing dots */}
          {isRinging && (
            <div className="flex gap-1.5 mt-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reminder Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5 w-full max-h-36 overflow-y-auto"
        >
          <p className="text-white text-lg font-semibold mb-2 text-center break-words">
            {reminderTitle}
          </p>
          {reminderWhy && (
            <p className="text-gray-300 text-sm text-center break-words line-clamp-3">
              {reminderWhy}
            </p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <AnimatePresence mode="wait">
          {showSnoozeOptions ? (
            <motion.div
              key="snooze-options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <p className="text-center text-gray-300 text-sm mb-2">
                Snooze for how long?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SNOOZE_OPTIONS.map((minutes) => (
                  <motion.button
                    key={minutes}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSnooze(minutes)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    {minutes} min
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => setShowSnoozeOptions(false)}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="main-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {/* Main action buttons */}
              <div className="flex gap-8 justify-center" role="group" aria-label="Call actions">
                {/* Decline Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onDecline}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="Decline call"
                >
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transform transition-transform">
                    <PhoneOff className="w-7 h-7 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-gray-300 text-xs font-medium group-hover:text-white transition-colors">
                    Decline
                  </span>
                </motion.button>

                {/* Answer Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsRinging(false);
                    onAnswer();
                  }}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="Answer call"
                >
                  <motion.div
                    animate={{ boxShadow: ['0 0 20px rgba(34, 197, 94, 0.4)', '0 0 40px rgba(34, 197, 94, 0.6)', '0 0 20px rgba(34, 197, 94, 0.4)'] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"
                  >
                    <Phone className="w-7 h-7 text-white" aria-hidden="true" />
                  </motion.div>
                  <span className="text-gray-300 text-xs font-medium group-hover:text-white transition-colors">
                    Answer
                  </span>
                </motion.button>
              </div>

              {/* Snooze button */}
              {onSnooze && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={() => setShowSnoozeOptions(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  aria-label="Snooze reminder"
                >
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm font-medium">Snooze</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

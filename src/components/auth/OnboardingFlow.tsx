import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Phone,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Flame,
  Users,
  Target,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    icon: Phone,
    title: 'Your Future Self is Calling',
    description:
      "Get reminded through simulated phone calls from your future self. It's not just a notification - it's a conversation with who you're becoming.",
    color: 'from-violet-500 via-purple-500 to-indigo-500',
    features: [
      { icon: Zap, text: 'AI-powered voice reminders' },
      { icon: Target, text: 'Personalized motivation' },
    ],
  },
  {
    id: 2,
    icon: Flame,
    title: 'Build Unstoppable Streaks',
    description:
      'Track your consistency with habit streaks. Complete your reminders daily and watch your discipline score grow.',
    color: 'from-orange-500 via-amber-500 to-yellow-500',
    features: [
      { icon: Sparkles, text: 'Visual streak tracking' },
      { icon: Target, text: 'Discipline score system' },
    ],
  },
  {
    id: 3,
    icon: Clock,
    title: 'Smart Scheduling',
    description:
      'Set reminders that work for you. Once, daily, weekly, or custom schedules. Snooze when needed, auto-recall when missed.',
    color: 'from-cyan-500 via-teal-500 to-emerald-500',
    features: [
      { icon: Clock, text: 'Flexible repeat patterns' },
      { icon: Bell, text: 'Smart auto-recall' },
    ],
  },
  {
    id: 4,
    icon: Users,
    title: 'Accountability Partners',
    description:
      'Connect with friends and family. Send reminders to each other and stay accountable together.',
    color: 'from-pink-500 via-rose-500 to-red-500',
    features: [
      { icon: Users, text: 'Partner reminders' },
      { icon: Sparkles, text: 'Group challenges' },
    ],
  },
  {
    id: 5,
    icon: Bell,
    title: 'Enable Notifications',
    description:
      "Never miss a call from your future self. Enable notifications to stay on track with your goals.",
    color: 'from-indigo-500 via-purple-500 to-pink-500',
    action: 'notifications',
    features: [],
  },
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { user } = useAuth();

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Complete onboarding
      if (user) {
        try {
          await supabase.from('user_settings').upsert({
            user_id: user.id,
            onboarding_completed: true,
            notifications_enabled: notificationsEnabled,
            updated_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to save onboarding settings to Supabase:', error);
        }
      }
      // Also save locally for immediate use
      let settings: Record<string, unknown> = {};
      try {
        settings = JSON.parse(localStorage.getItem('aiReminderSettings') || '{}') as Record<string, unknown>;
      } catch {
        // Use empty object if parse fails
      }
      settings.onboardingCompleted = true;
      settings.notificationsEnabled = notificationsEnabled;
      localStorage.setItem('aiReminderSettings', JSON.stringify(settings));

      onComplete();
    } else {
      // Use functional update to avoid race conditions
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    // Use functional update to avoid race conditions
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative w-full max-w-lg z-10">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentStep
                  ? 'w-10 bg-gradient-to-r from-indigo-400 to-purple-400'
                  : index < currentStep
                  ? 'w-3 bg-indigo-400/60'
                  : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass rounded-3xl p-8 shadow-2xl"
          >
            {/* Icon with animated background */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative mb-8"
            >
              <div className={`w-24 h-24 bg-gradient-to-br ${step.color} rounded-3xl flex items-center justify-center mx-auto shadow-2xl`}>
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Icon className="w-12 h-12 text-white drop-shadow-lg" />
                </motion.div>
              </div>

              {/* Floating particles around icon */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white/40 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: [0, (i - 1) * 50, 0],
                    y: [0, (i % 2 === 0 ? -30 : 30), 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                />
              ))}
            </motion.div>

            {/* Content */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white text-center mb-4"
            >
              {step.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 text-center mb-8 leading-relaxed"
            >
              {step.description}
            </motion.p>

            {/* Features list */}
            {step.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-3 mb-8"
              >
                {step.features.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20"
                  >
                    <feature.icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-gray-200">{feature.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Notification action */}
            {step.action === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                {notificationsEnabled ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center gap-3 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                    >
                      <Check className="w-6 h-6" />
                    </motion.div>
                    <span className="font-medium">Notifications enabled!</span>
                  </motion.div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={requestNotifications}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Bell className="w-5 h-5" />
                    Enable Notifications
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3"
            >
              {currentStep > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBack}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className={`flex-1 py-4 bg-gradient-to-r ${step.color} text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg`}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Get Started
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                  </>
                ) : (
                  <>
                    Continue
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Skip option */}
            {currentStep < steps.length - 1 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => {
                  let settings: Record<string, unknown> = {};
                  try {
                    settings = JSON.parse(localStorage.getItem('aiReminderSettings') || '{}') as Record<string, unknown>;
                  } catch {
                    // Use empty object if parse fails
                  }
                  settings.onboardingCompleted = true;
                  localStorage.setItem('aiReminderSettings', JSON.stringify(settings));
                  onComplete();
                }}
                className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip intro
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

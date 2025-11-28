import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Phone, Clock, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    icon: Bell,
    title: 'Welcome to YFS',
    description: 'Your Future Self Reminder - an app that calls you like your future self to keep you on track.',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    id: 2,
    icon: Phone,
    title: 'AI Voice Reminders',
    description: 'When a reminder triggers, you\'ll receive a simulated phone call with an AI voice speaking your reminder.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 3,
    icon: Clock,
    title: 'Flexible Scheduling',
    description: 'Set one-time or recurring reminders. Daily, weekly, or custom schedules to fit your routine.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 4,
    icon: Sparkles,
    title: 'Enable Notifications',
    description: 'Allow notifications so you never miss a reminder. You can customize sounds and auto-recall settings.',
    color: 'from-rose-500 to-orange-500',
    action: 'notifications',
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
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          onboarding_completed: true,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString(),
        });
      }
      // Also save locally for immediate use
      let settings = {};
      try {
        settings = JSON.parse(localStorage.getItem('aiReminderSettings') || '{}');
      } catch {
        // Use empty object if parse fails
      }
      (settings as Record<string, unknown>).onboardingCompleted = true;
      (settings as Record<string, unknown>).notificationsEnabled = notificationsEnabled;
      localStorage.setItem('aiReminderSettings', JSON.stringify(settings));

      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-indigo-600'
                  : index < currentStep
                  ? 'w-2 bg-indigo-400'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-xl p-8"
          >
            {/* Icon */}
            <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
              <Icon className="w-10 h-10 text-white" />
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              {step.title}
            </h2>
            <p className="text-gray-600 text-center mb-8 leading-relaxed">
              {step.description}
            </p>

            {/* Notification action */}
            {step.action === 'notifications' && (
              <div className="mb-8">
                {notificationsEnabled ? (
                  <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg text-green-700">
                    <Check className="w-5 h-5" />
                    <span>Notifications enabled!</span>
                  </div>
                ) : (
                  <button
                    onClick={requestNotifications}
                    className="w-full py-3 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Get Started
                    <Check className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Skip option */}
            {currentStep < steps.length - 1 && (
              <button
                onClick={() => {
                  let settings = {};
                  try {
                    settings = JSON.parse(localStorage.getItem('aiReminderSettings') || '{}');
                  } catch {
                    // Use empty object if parse fails
                  }
                  (settings as Record<string, unknown>).onboardingCompleted = true;
                  localStorage.setItem('aiReminderSettings', JSON.stringify(settings));
                  onComplete();
                }}
                className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip intro
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

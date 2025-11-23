import { X, Sparkles, Users, Share2, Zap, Shield } from 'lucide-react';

interface ComingSoonModalProps {
  onClose: () => void;
}

export default function ComingSoonModal({ onClose }: ComingSoonModalProps) {
  const upcomingFeatures = [
    {
      icon: Users,
      title: 'Accountability Partners',
      description: 'Connect with a friend or mentor who gets notified if you miss reminders. They can also send you motivational calls.',
      color: 'bg-blue-100 text-blue-600',
      status: 'In Development',
    },
    {
      icon: Share2,
      title: 'Group Reminders',
      description: 'Create shared reminders for study groups, fitness challenges, or team goals. Stay accountable together.',
      color: 'bg-purple-100 text-purple-600',
      status: 'Planned',
    },
    {
      icon: Zap,
      title: 'Smart Habit Tracking',
      description: 'AI-powered insights on your habit patterns, streak tracking, and personalized recommendations for improvement.',
      color: 'bg-yellow-100 text-yellow-600',
      status: 'Planned',
    },
    {
      icon: Shield,
      title: 'Advanced Panic Mode',
      description: 'Pre-configured contacts who can be alerted in emergencies. Automated support calls with customizable escalation.',
      color: 'bg-red-100 text-red-600',
      status: 'Researching',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Coming Soon</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center mb-8">
            <p className="text-gray-600">
              We're constantly working to make Yrfrsf better. Here's what's in the pipeline:
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-6">
            {upcomingFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                        <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          {feature.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Want to help shape these features?</h4>
            <p className="text-gray-700 text-sm mb-4">
              Your feedback is invaluable! Let us know what features you'd like to see or how we can improve existing ones.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-sm"
            >
              Share Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

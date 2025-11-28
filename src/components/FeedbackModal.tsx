import { useState } from 'react';
import { X, Send, MessageCircle, Lightbulb, Bug, Heart } from 'lucide-react';

interface FeedbackModalProps {
  onClose: () => void;
}

type FeedbackType = 'feature' | 'bug' | 'general' | 'appreciation';

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'feature' as FeedbackType, icon: Lightbulb, label: 'Feature Request', color: 'bg-yellow-100 text-yellow-600' },
    { id: 'bug' as FeedbackType, icon: Bug, label: 'Bug Report', color: 'bg-red-100 text-red-600' },
    { id: 'general' as FeedbackType, icon: MessageCircle, label: 'General Feedback', color: 'bg-blue-100 text-blue-600' },
    { id: 'appreciation' as FeedbackType, icon: Heart, label: 'Appreciation', color: 'bg-pink-100 text-pink-600' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Store feedback in localStorage (in production, this would go to a backend)
    const feedback = {
      type,
      message,
      email,
      timestamp: Date.now(),
    };

    let feedbackList: unknown[] = [];
    try {
      const existingFeedback = localStorage.getItem('userFeedback');
      feedbackList = existingFeedback ? JSON.parse(existingFeedback) : [];
    } catch {
      // Use empty array if parse fails
    }
    feedbackList.push(feedback);
    localStorage.setItem('userFeedback', JSON.stringify(feedbackList));

    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600">
            Your feedback has been received. We appreciate you taking the time to help us improve YFS!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Send Feedback</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <p className="text-gray-600 mb-6">
              We'd love to hear from you! Your feedback helps us build a better product.
            </p>

            {/* Feedback Type Selection */}
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to share?
            </label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {feedbackTypes.map((feedbackType) => {
                const Icon = feedbackType.icon;
                return (
                  <button
                    key={feedbackType.id}
                    type="button"
                    onClick={() => setType(feedbackType.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      type === feedbackType.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 ${feedbackType.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-medium ${
                      type === feedbackType.id ? 'text-indigo-900' : 'text-gray-700'
                    }`}>
                      {feedbackType.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'feature'
                  ? 'Describe the feature you\'d like to see...'
                  : type === 'bug'
                  ? 'Describe the bug and steps to reproduce...'
                  : type === 'appreciation'
                  ? 'Share what you love about YFS...'
                  : 'Share your thoughts...'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={6}
              required
            />
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500">
              Leave your email if you'd like us to follow up with you
            </p>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Your feedback is stored locally and helps us improve the app. We don't collect any personal data unless you provide it.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!message.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface CompletionPromptModalProps {
  reminderTitle: string;
  reminderWhy: string;
  onComplete: () => void;
  onNotComplete: () => void;
  onSkip: () => void;
}

export default function CompletionPromptModal({
  reminderTitle,
  reminderWhy,
  onComplete,
  onNotComplete,
  onSkip,
}: CompletionPromptModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleResponse = (callback: () => void) => {
    setIsAnimating(true);
    setTimeout(() => {
      callback();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all ${
        isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Did you complete this?</h2>
            <button
              onClick={() => handleResponse(onSkip)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-900 mb-1">{reminderTitle}</p>
            {reminderWhy && (
              <p className="text-sm text-gray-600">{reminderWhy}</p>
            )}
          </div>

          <p className="text-sm text-gray-600 text-center">
            This helps track your accountability and build better habits
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => handleResponse(onNotComplete)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            Not Yet
          </button>
          <button
            onClick={() => handleResponse(onComplete)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Yes, Done!
          </button>
        </div>
      </div>
    </div>
  );
}

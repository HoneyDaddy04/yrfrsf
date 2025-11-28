import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-indigo max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 mb-4">
              When you use YFS, we collect the following information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Email address, name (optional), and password when you create an account.</li>
              <li><strong>Reminder Data:</strong> The reminders you create, including titles, descriptions, and scheduling preferences.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our service, including call history and completion tracking.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers for service optimization.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Provide and maintain the YFS service</li>
              <li>Send you reminder notifications at your scheduled times</li>
              <li>Sync your data across devices when you're logged in</li>
              <li>Improve and personalize your experience</li>
              <li>Communicate with you about service updates</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Data Storage and Security</h2>
            <p className="text-gray-600 mb-4">
              Your data is stored securely using Supabase, which provides enterprise-grade security:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>All data is encrypted in transit (TLS/SSL) and at rest</li>
              <li>We use secure authentication protocols</li>
              <li>Your password is hashed and never stored in plain text</li>
              <li>Regular security audits and updates</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              We may use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li><strong>Supabase:</strong> For authentication and database storage</li>
              <li><strong>OpenAI (Optional):</strong> If you choose to use premium AI voice features and provide your own API key</li>
              <li><strong>Google Sign-In (Optional):</strong> If you choose to sign in with Google</li>
            </ul>
            <p className="text-gray-600 mb-4">
              <strong>Important:</strong> If you use OpenAI TTS features, your API key is stored locally on your device and sent directly to OpenAI. We never store or transmit your OpenAI API key through our servers.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5. Your Rights</h2>
            <p className="text-gray-600 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Access your personal data</li>
              <li>Export your data at any time</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Update or correct your information</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your data for as long as your account is active. If you delete your account, all your data will be permanently removed within 30 days.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7. Children's Privacy</h2>
            <p className="text-gray-600 mb-4">
              YFS is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-600 mb-4">
              Email: privacy@yfsapp.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

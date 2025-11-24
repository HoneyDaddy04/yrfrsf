import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-indigo max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using Yrfrsf ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Yrfrsf is a reminder application that provides AI-powered voice notifications to help users stay on track with their tasks and goals. The Service includes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Creating and managing reminders</li>
              <li>Receiving simulated phone call notifications</li>
              <li>AI voice text-to-speech features</li>
              <li>Progress tracking and insights</li>
              <li>Cross-device synchronization (with an account)</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Upload malicious content or code</li>
              <li>Resell or redistribute the Service without permission</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5. API Keys and Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              If you choose to use OpenAI TTS features, you are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Obtaining and managing your own OpenAI API key</li>
              <li>Complying with OpenAI's terms of service</li>
              <li>Any costs associated with your API usage</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              The Service and its original content, features, and functionality are owned by Yrfrsf and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7. User Content</h2>
            <p className="text-gray-600 mb-4">
              You retain ownership of any content you create within the Service (reminder titles, descriptions, etc.). By using the Service, you grant us a license to store and process this content solely for the purpose of providing the Service to you.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-gray-600 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, YRFRSF SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">10. Termination</h2>
            <p className="text-gray-600 mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. You may also delete your account at any time through the Settings.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating the "Last updated" date and, where appropriate, notifying you via email.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">12. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Yrfrsf operates, without regard to conflict of law principles.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">13. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-600 mb-4">
              Email: legal@yrfrsf.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy | LINC';
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 md:p-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
            <Lock className="text-[#8B1E1E]" />
          </div>
          <h1 className="text-4xl font-serif text-[#1C1917]">Privacy Policy</h1>
        </div>

        <div className="space-y-8 text-stone-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
              <Eye size={20} className="text-[#8B1E1E]" />
              Information We Collect
            </h2>
            <p>
              The LINC Portal collects information provided by you through our assessment forms, including your name, contact details, and spiritual assessment data. When you use our Google integration features (like creating Google Meet links), we request access to your Google Calendar to perform specific actions on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-[#8B1E1E]" />
              How We Use Your Data
            </h2>
            <p>
              Your assessment data is used exclusively for pastoral care and spiritual growth tracking within our community. We do not sell or share your personal data with third parties. Google account data is used only to facilitate meeting scheduling and is not stored permanently on our servers beyond the temporary session tokens required for these actions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-[#8B1E1E]" />
              Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your information. Access to spiritual assessment data is restricted to authorized pastoral leadership only.
            </p>
          </section>

          <section className="pt-8 border-t border-stone-100">
            <p className="text-sm italic">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p className="mt-4">
              If you have any questions about this Privacy Policy, please contact our administrative team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

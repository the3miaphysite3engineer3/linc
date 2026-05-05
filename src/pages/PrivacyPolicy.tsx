import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Database, Mail, Clock, FileText } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy | LINC';
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f4f0]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-[52px] h-[52px] grid place-items-center mx-auto mb-4 rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_18px_rgba(139,30,30,0.25)]">
            <Shield size={24} />
          </div>
          <h1 className="text-[clamp(1.8rem,5vw,2.6rem)] font-bold text-[#8b1e1e] mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: May 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-[22px] border border-[rgba(139,30,30,0.1)] shadow-[0_8px_28px_rgba(0,0,0,0.06)] p-[clamp(24px,4vw,40px)] space-y-10">
          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Eye size={20} />
              1. Information We Collect
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              When you complete the LINC Spiritual Gifts & Personal Calling Assessment, we collect the following information:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
              <li>Full name and email address</li>
              <li>Age, church attendance history, and current service role</li>
              <li>Responses to spiritual gift assessment questions</li>
              <li>Faith journey reflections and vision statements</li>
              <li>Ministry area preferences and interest levels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Database size={20} />
              2. How We Use Your Information
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              Your assessment results are used solely for church leadership purposes, including:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
              <li>Identifying your spiritual gifts and calling</li>
              <li>Recommending suitable ministry areas within LINC</li>
              <li>Supporting pastoral care and discipleship</li>
              <li>Communicating meeting invitations and church events</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Mail size={20} />
              3. Email Communication
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              We use Gmail to send you assessment results and meeting invitations. Your email address is stored securely and will never be shared with third parties or used for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Clock size={20} />
              4. Data Retention
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              Your assessment data is stored in Firebase Realtime Database and retained for as long as necessary for pastoral care and leadership development purposes. You may request deletion of your data at any time by contacting church leadership.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <FileText size={20} />
              5. Data Security
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              We implement reasonable security measures to protect your personal information. Assessment results are accessible only to authorized church leadership through authenticated access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">6. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              You have the right to access, correct, or request deletion of your personal data at any time. Contact LINC leadership for any data-related requests.
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-[#8B1E1E] hover:underline font-bold">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

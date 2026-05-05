import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, ScrollText, AlertCircle, CheckCircle, Heart } from 'lucide-react';

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service | LINC';
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f4f0]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-[52px] h-[52px] grid place-items-center mx-auto mb-4 rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_18px_rgba(139,30,30,0.25)]">
            <Gavel size={24} />
          </div>
          <h1 className="text-[clamp(1.8rem,5vw,2.6rem)] font-bold text-[#8b1e1e] mb-3">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: May 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-[22px] border border-[rgba(139,30,30,0.1)] shadow-[0_8px_28px_rgba(0,0,0,0.06)] p-[clamp(24px,4vw,40px)] space-y-10">
          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <ScrollText size={20} />
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              By accessing and using the LINC Spiritual Gifts & Personal Calling Assessment, you agree to be bound by these Terms of Service. If you do not agree, please do not use this application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Heart size={20} />
              2. Purpose
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              This application is designed exclusively for members of LINC Ministries participating in the Leadership Development Program (2026–2028). It is intended to help trainees discover their spiritual gifts, explore their calling, and align with suitable ministry areas under pastoral guidance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              3. Honest Participation
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              Participants are expected to answer all assessment questions honestly and to the best of their ability. The accuracy of your spiritual gift analysis depends on truthful responses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              4. Confidentiality
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              All assessment results are confidential and accessible only to authorized LINC church leadership. Your personal data will not be shared with any third parties. Results are used solely for pastoral care and ministry placement purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">5. Data Storage</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              Assessment data is stored securely using Firebase Realtime Database. Meeting and calendar data are also stored in Firebase. Email communications are sent via Gmail API with appropriate authentication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              The spiritual gift assessment results are analytical tools meant to guide discussion with church leadership. They do not constitute definitive spiritual direction or professional counseling. LINC Ministries is not liable for decisions made based solely on these results.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              LINC Ministries reserves the right to modify these Terms of Service at any time. Continued use of the application constitutes acceptance of any updated terms.
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

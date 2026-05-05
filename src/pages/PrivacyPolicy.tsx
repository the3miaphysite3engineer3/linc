import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Database, Mail, Clock, FileText } from 'lucide-react';
import { useI18n } from '../i18n';

export default function PrivacyPolicy() {
  const { t, dir } = useI18n();

  useEffect(() => {
    document.title = `${t('privacy.title')} | LINC`;
  }, [t]);

  return (
    <div className="min-h-screen bg-[#f5f4f0]" style={{ fontFamily: 'Arial, sans-serif' }} dir={dir}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-[52px] h-[52px] grid place-items-center mx-auto mb-4 rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_18px_rgba(139,30,30,0.25)]">
            <Shield size={24} />
          </div>
          <h1 className="text-[clamp(1.8rem,5vw,2.6rem)] font-bold text-[#8b1e1e] mb-3">{t('privacy.title')}</h1>
          <p className="text-gray-500 text-sm">{t('privacy.updated')}: May 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-[22px] border border-[rgba(139,30,30,0.1)] shadow-[0_8px_28px_rgba(0,0,0,0.06)] p-[clamp(24px,4vw,40px)] space-y-10">
          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Eye size={20} />
              {t('privacy.section1Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section1Desc')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
              <li>{t('privacy.section1Item1')}</li>
              <li>{t('privacy.section1Item2')}</li>
              <li>{t('privacy.section1Item3')}</li>
              <li>{t('privacy.section1Item4')}</li>
              <li>{t('privacy.section1Item5')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Database size={20} />
              {t('privacy.section2Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section2Desc')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
              <li>{t('privacy.section2Item1')}</li>
              <li>{t('privacy.section2Item2')}</li>
              <li>{t('privacy.section2Item3')}</li>
              <li>{t('privacy.section2Item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Mail size={20} />
              {t('privacy.section3Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section3Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <Clock size={20} />
              {t('privacy.section4Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section4Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4 flex items-center gap-2">
              <FileText size={20} />
              {t('privacy.section5Title')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section5Desc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#8b1e1e] mb-4">{t('privacy.section6Title')}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              {t('privacy.section6Desc')}
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-[#8B1E1E] hover:underline font-bold">
            &larr; {t('privacy.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}

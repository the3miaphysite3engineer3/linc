import { motion } from 'motion/react';
import { BookOpen, Calendar as CalendarIcon, Users, Mail, Shield, Globe, AlertCircle, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useEffect } from 'react';

export default function GuidePage() {
  const { t, dir } = useI18n();

  useEffect(() => {
    document.title = `${t('guide.title')} | LINC`;
  }, [t]);

  const sections = [
    {
      icon: <Shield size={24} />,
      title: t('guide.authTitle'),
      desc: t('guide.authDesc'),
      details: [t('guide.authDetail1'), t('guide.authDetail2')],
    },
    {
      icon: <Users size={24} />,
      title: t('guide.assessmentTitle'),
      desc: t('guide.assessmentDesc'),
      details: [t('guide.assessmentDetail1'), t('guide.assessmentDetail2'), t('guide.assessmentDetail3')],
    },
    {
      icon: <CalendarIcon size={24} />,
      title: t('guide.calendarTitle'),
      desc: t('guide.calendarDesc'),
      details: [t('guide.calendarDetail1'), t('guide.calendarDetail2'), t('guide.calendarDetail3')],
    },
    {
      icon: <Mail size={24} />,
      title: t('guide.requestsTitle'),
      desc: t('guide.requestsDesc'),
      details: [t('guide.requestsDetail1'), t('guide.requestsDetail2'), t('guide.requestsDetail3'), t('guide.requestsDetail4')],
    },
    {
      icon: <Globe size={24} />,
      title: t('guide.langTitle'),
      desc: t('guide.langDesc'),
      details: [t('guide.langDetail1'), t('guide.langDetail2')],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <div className="w-16 h-16 bg-[#8b1e1e] rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
          <BookOpen size={32} />
        </div>
        <h1 className="text-3xl font-bold text-[#8b1e1e] mb-2">{t('guide.title')}</h1>
        <p className="text-gray-500 max-w-xl mx-auto">{t('guide.subtitle')}</p>
      </motion.div>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center text-[#8b1e1e] flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">{section.title}</h2>
                <p className="text-gray-600 mb-4">{section.desc}</p>
                <ul className="space-y-2">
                  {section.details.map((detail, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-500">
                      <ChevronRight size={16} className="text-[#8b1e1e] mt-0.5 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-12 bg-[#f8eeee] rounded-2xl p-6 border border-[#8b1e1e]/10"
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-[#8b1e1e] flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-[#8b1e1e] mb-1">{t('guide.supportTitle')}</h3>
            <p className="text-sm text-gray-600">{t('guide.supportDesc')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

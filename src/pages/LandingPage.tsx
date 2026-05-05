import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ClipboardList, LogIn, ArrowRight, Heart, BookOpen, Users, Star, Globe, Calendar as CalendarIcon } from 'lucide-react';
import { useI18n } from '../i18n';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, dir, locale, setLocale } = useI18n();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    document.title = locale === 'ar' ? 'تقييم المواهب الروحية - LINC' : 'LINC Spiritual Gifts Assessment';
  }, [locale]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const Arrow = locale === 'ar' ? <ArrowRight size={20} className="rotate-180" /> : <ArrowRight size={20} />;

  const giftAreas = [
    { en: 'Apostolic', ar: 'رسولية' },
    { en: 'Prophetic', ar: 'نبوية' },
    { en: 'Evangelistic', ar: 'تبشيرية' },
    { en: 'Pastoral', ar: 'رعوية' },
    { en: 'Teaching', ar: 'تعليم' },
  ];

  return (
    <div className="min-h-screen" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#f5f4f0]">
        {/* Language Toggle */}
        <button
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          className={`absolute top-6 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-10 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-[rgba(139,30,30,0.15)] rounded-full text-sm font-bold text-[#8b1e1e] shadow-sm transition-all hover:bg-white hover:shadow-md`}
        >
          <Globe size={16} />
          {locale === 'en' ? 'العربية' : 'English'}
        </button>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 60%)',
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />
        <div className="relative text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-[60px] h-[60px] grid place-items-center mx-auto mb-6 rounded-full bg-[#8b1e1e] text-white text-2xl shadow-[0_8px_28px_rgba(139,30,30,0.25)]">
              ✦
            </div>
            <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-bold text-[#8b1e1e] leading-[1.15] tracking-[-0.02em] mb-6">
              {t('landing.title')}
              <br />
              <span className="text-[#641414]">{t('landing.subtitle')}</span>
            </h1>
            <p className="text-[#666] text-[clamp(1rem,2.5vw,1.2rem)] max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('landing.description')}
            </p>
            <p className="text-[#999] uppercase tracking-[0.25em] text-xs font-bold mb-12">
              {t('landing.program')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/assessment')}
                className="inline-flex items-center gap-3 min-h-[56px] px-10 bg-[#8b1e1e] text-white rounded-full font-bold text-lg shadow-[0_8px_28px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(139,30,30,0.3)]"
              >
                {t('landing.takeAssessment')}
                {Arrow}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-3 min-h-[56px] px-10 bg-white text-[#8b1e1e] border-2 border-[#8b1e1e] rounded-full font-bold text-lg transition-transform hover:-translate-y-[2px] hover:bg-[#f8eeee]"
              >
                <LogIn size={18} />
                {t('landing.adminLogin')}
              </button>
            </div>
            <button
              onClick={() => navigate('/booking')}
              className="mt-6 inline-flex items-center gap-3 min-h-[52px] px-8 bg-stone-100 text-[#8b1e1e] rounded-full font-bold transition-transform hover:-translate-y-[2px] hover:bg-stone-200"
            >
              <CalendarIcon size={18} />
              {t('landing.bookMeeting')}
            </button>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#8b1e1e] mb-16"
          >
            {locale === 'ar' ? 'كيف يعمل' : 'How It Works'}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <ClipboardList size={32} />,
                title: locale === 'ar' ? 'ابدأ التقييم' : 'Take the Assessment',
                desc: locale === 'ar'
                  ? 'أجب على أسئلة مدروسة حول رحلتك الإيمانية ومواهبك الروحية وشغفك بالخدمة.'
                  : 'Answer thoughtful questions about your faith journey, spiritual gifts, and ministry passions.',
                delay: 0.1,
              },
              {
                icon: <Star size={32} />,
                title: locale === 'ar' ? 'اكتشف مواهبك' : 'Discover Your Gifts',
                desc: locale === 'ar'
                  ? 'احصل على تقرير شخصي يبرز موهبتك الروحية الأساسية والثانوية.'
                  : 'Receive a personalized report highlighting your primary and secondary spiritual gifts.',
                delay: 0.2,
              },
              {
                icon: <Heart size={32} />,
                title: locale === 'ar' ? 'اعثر على دعوتك' : 'Find Your Calling',
                desc: locale === 'ar'
                  ? 'احصل على توصية بمجال الخدمة الذي يتوافق مع مواهبك الفريدة وشغفك.'
                  : 'Get matched with the ministry area that aligns with your unique gifts and passions.',
                delay: 0.3,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: item.delay, duration: 0.5 }}
                className="text-center p-8 rounded-[22px] bg-[#f5f4f0] border border-[rgba(139,30,30,0.08)]"
              >
                <div className="w-16 h-16 grid place-items-center mx-auto mb-6 rounded-2xl bg-[#f8eeee] text-[#8b1e1e]">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-[#641414] mb-3">{item.title}</h3>
                <p className="text-[#666] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#f5f4f0]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 grid place-items-center mx-auto mb-6 rounded-full bg-[#8b1e1e] text-white text-lg shadow-lg">
              <BookOpen size={20} />
            </div>
            <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#8b1e1e] mb-6">
              {locale === 'ar' ? 'عن البرنامج' : 'About the Program'}
            </h2>
            <p className="text-[#666] text-lg leading-relaxed max-w-3xl mx-auto mb-6">
              {locale === 'ar'
                ? 'صُمم تقييم المواهب الروحية لمساعدتك في تحديد نقاط قوتك التي وهبها الله لك واكتشاف أين يمكنك الخدمة بفعالية أكبر. من خلال أسئلة مدروسة تغطي خمسة مجالات للمواهب وعشرة مجالات للخدمة، ستحصل على وضوح حول دعوتك الروحية.'
                : 'The LINC Spiritual Gifts Assessment is designed to help you identify your God-given strengths and discover where you can serve most effectively. Through thoughtful questions covering five gift areas and ten ministry domains, you\'ll gain clarity on your spiritual calling.'}
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-10">
              {giftAreas.map(gift => (
                <span key={gift.en} className="px-5 py-2 bg-white rounded-full text-sm font-bold text-[#8b1e1e] border border-[rgba(139,30,30,0.12)] shadow-sm">
                  {locale === 'ar' ? gift.ar : gift.en}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#8b1e1e] text-white text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="w-16 h-16 grid place-items-center mx-auto mb-6 rounded-full bg-white/10 text-2xl border border-white/20">
            <Users size={28} />
          </div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold mb-6">
            {t('landing.readyTitle')}
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">
            {t('landing.readyDesc')}
          </p>
          <button
            onClick={() => navigate('/assessment')}
            className="inline-flex items-center gap-3 min-h-[56px] px-12 bg-white text-[#8b1e1e] rounded-full font-bold text-lg shadow-lg transition-transform hover:-translate-y-[2px]"
          >
            {t('landing.startNow')}
            {Arrow}
          </button>
        </motion.div>
      </section>

      <footer className="py-10 px-6 bg-[#1a1a1a] text-white/60 text-center">
        <p className="text-sm italic">{t('footer.tagline')}</p>
        <p className="text-xs mt-2 text-white/30">{t('landing.program')}</p>
      </footer>
    </div>
  );
}

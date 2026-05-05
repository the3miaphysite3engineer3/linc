import React from 'react';
import { motion } from 'motion/react';
import { Church, LayoutDashboard, ClipboardList, Calendar as CalendarIcon, LogOut, Home, Globe, BookOpen, CalendarDays } from 'lucide-react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export default function Layout({ children, activeTab, isAdmin, isSuperAdmin }: LayoutProps) {
  const [user] = useAuthState(auth);
  const { t, dir, locale, setLocale } = useI18n();

  return (
    <div className="min-h-screen bg-[#f5f4f0]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#8B1E1E] rounded-md flex items-center justify-center text-white font-bold">
              <Church size={20} />
            </div>
            <span className="font-bold hidden sm:block text-[#8b1e1e]">LINC</span>
          </Link>
        </div>

        <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar">
          <Link
            to="/"
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 text-sm font-medium transition-colors ${activeTab === 'home' ? 'text-[#8B1E1E]' : 'text-gray-500 hover:text-[#8B1E1E]'}`}
          >
            <Home size={20} />
            <span className="text-[10px] md:text-sm uppercase tracking-wider">{t('nav.home')}</span>
          </Link>
          <Link
            to="/assessment"
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 text-sm font-medium transition-colors ${activeTab === 'assessment' ? 'text-[#8B1E1E]' : 'text-gray-500 hover:text-[#8B1E1E]'}`}
          >
            <ClipboardList size={20} />
            <span className="text-[10px] md:text-sm uppercase tracking-wider">{t('nav.assessment')}</span>
          </Link>
          <Link
            to="/booking"
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 text-sm font-medium transition-colors ${activeTab === 'booking' ? 'text-[#8B1E1E]' : 'text-gray-500 hover:text-[#8B1E1E]'}`}
          >
            <CalendarDays size={20} />
            <span className="text-[10px] md:text-sm uppercase tracking-wider">{t('nav.book')}</span>
          </Link>

          {isAdmin && (
            <>
              {isSuperAdmin && (
                <Link
                  to="/dashboard"
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-[#8B1E1E]' : 'text-gray-500 hover:text-[#8B1E1E]'}`}
                >
                  <LayoutDashboard size={20} />
                  <span className="text-[10px] md:text-sm uppercase tracking-wider">{t('nav.results')}</span>
                </Link>
              )}
              <Link
                to="/calendar"
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'text-[#8B1E1E]' : 'text-gray-500 hover:text-[#8B1E1E]'}`}
              >
                <CalendarIcon size={20} />
                <span className="text-[10px] md:text-sm uppercase tracking-wider">{t('nav.calendar')}</span>
              </Link>
              <Link
                to="/guide"
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 text-sm font-medium transition-colors ${activeTab === 'guide' ? 'text-[#8B1E1E]' : 'text-gray-500 hover:text-[#8B1E1E]'}`}
              >
                <BookOpen size={20} />
                <span className="text-[10px] md:text-sm uppercase tracking-wider">{t('nav.guide')}</span>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8B1E1E] border border-[#8B1E1E] rounded-full hover:bg-[#f8eeee] transition-colors"
          >
            <Globe size={14} />
            {locale === 'en' ? 'ع' : 'En'}
          </button>
          {user && (
            <button
              onClick={() => auth.signOut()}
              className="text-gray-500 hover:text-[#8B1E1E] transition-colors p-2"
              title={t('nav.signOut')}
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </nav>

      <main className="pt-4 pb-20 md:pt-24 md:pb-12 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          key={activeTab}
        >
          {children}
        </motion.div>
      </main>

      <footer className="py-8 border-t border-gray-200 bg-white text-center">
        <p className="italic text-sm text-gray-500">{t('footer.tagline')}</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/privacy" className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#8B1E1E] transition-colors">
            {t('footer.privacy')}
          </Link>
          <Link to="/tos" className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#8B1E1E] transition-colors">
            {t('footer.tos')}
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {t('footer.created')} <span className="font-bold text-[#8b1e1e]">T-TLabs</span>
        </p>
      </footer>
    </div>
  );
}

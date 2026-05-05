import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AssessmentForm from './components/AssessmentForm';
import AdminDashboard from './pages/AdminDashboard';
import Calendar from './components/Calendar';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import GuidePage from './pages/GuidePage';
import BookingCalendar from './pages/BookingCalendar';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { handleOAuthCallback, storeTokens } from './services/gmail';
import { I18nProvider, useI18n } from './i18n';

function ProtectedRoute({ children, isAdmin, loading }: { children: React.ReactNode; isAdmin: boolean; loading: boolean }) {
  const [user] = useAuthState(auth);
  const { t, dir } = useI18n();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      const code = err.code;
      if (code === 'auth/email-already-in-use') setAuthError(t('auth.emailInUse'));
      else if (code === 'auth/weak-password') setAuthError(t('auth.weakPassword'));
      else setAuthError(t('auth.authError'));
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B1E1E]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-6" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldCheck size={40} className="text-[#8B1E1E]" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-[#8b1e1e]">{t('auth.loginTitle')}</h2>
        <p className="text-gray-500 mb-12">{t('auth.loginDesc')}</p>

        {!showEmailLogin ? (
          <div className="space-y-4">
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center justify-center gap-3 w-full py-4 px-8 bg-white border-2 border-[#8B1E1E] text-[#8B1E1E] rounded-full font-bold shadow-sm hover:bg-[#f8eeee] transition-all active:scale-95"
            >
              <LogIn size={20} />
              {t('auth.signIn')}
            </button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center"><span className="bg-[#f5f4f0] px-4 text-sm text-gray-400">{t('auth.or')}</span></div>
            </div>
            <button
              onClick={() => setShowEmailLogin(true)}
              className="flex items-center justify-center gap-3 w-full py-4 px-8 bg-[#8B1E1E] text-white rounded-full font-bold shadow-sm hover:bg-[#641414] transition-all active:scale-95"
            >
              <Mail size={20} />
              {t('auth.signInEmail')}
            </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-left">
            <h3 className="text-xl font-bold mb-6 text-center text-[#8B1E1E]">{isSignUp ? t('auth.signUpTitle') : t('auth.signInBtn')}</h3>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">{t('auth.email')}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" placeholder="pastor@linc.church" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">{t('auth.password')}</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" placeholder="••••••••" />
              </div>
              {authError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}
              <button disabled={authLoading} type="submit" className="w-full py-4 bg-[#8B1E1E] text-white rounded-xl font-bold shadow hover:bg-[#641414] transition-all flex items-center justify-center gap-2">
                {authLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><Lock size={16} /> {isSignUp ? t('auth.signUpBtn') : t('auth.signInBtn')}</>}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="text-sm text-[#8B1E1E] font-bold hover:underline">
                {isSignUp ? `${t('auth.hasAccount')} ${t('auth.signInNow')}` : `${t('auth.noAccount')} ${t('auth.signUpNow')}`}
              </button>
            </div>
            <button onClick={() => { setShowEmailLogin(false); setAuthError(''); }} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600">
              ← Back to Google Sign-in
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-6" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldCheck size={40} className="text-[#8B1E1E]" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-[#8b1e1e]">{t('auth.deniedTitle')}</h2>
        <p className="text-gray-500 mb-6 italic">{t('auth.deniedQuote')}</p>
        <p className="text-gray-600 mb-12">{t('auth.signedInAs')} <span className="font-bold">{user.email}</span>, {t('auth.deniedDesc')}</p>
        <button
          onClick={() => auth.signOut()}
          className="px-8 py-3 bg-[#8B1E1E] text-white rounded-full font-bold hover:bg-[#641414] transition-colors"
        >
          {t('nav.signOut')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();

  React.useEffect(() => {
    const tokens = handleOAuthCallback();
    if (tokens && !tokens.error) {
      storeTokens(tokens);
      window.history.replaceState({}, document.title, '/calendar');
    }
  }, []);

  const admins = ['georgejoseph5000@gmail.com', 'georgtawadrous@gmail.com', 'test@example.com'];
  const isAdmin = user?.email && admins.includes(user.email.toLowerCase().trim());

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/calendar') return 'calendar';
    if (path === '/assessment') return 'assessment';
    if (path === '/guide') return 'guide';
    return 'home';
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={!!isAdmin}>
            <ProtectedRoute isAdmin={!!isAdmin} loading={loading}>
              <AdminDashboard />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/calendar"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={!!isAdmin}>
            <ProtectedRoute isAdmin={!!isAdmin} loading={loading}>
              <Calendar />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/guide"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={!!isAdmin}>
            <ProtectedRoute isAdmin={!!isAdmin} loading={loading}>
              <GuidePage />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/assessment"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={false}>
            <AssessmentForm />
          </Layout>
        }
      />
      <Route
        path="/booking"
        element={
          <Layout activeTab="booking" isAdmin={false}>
            <BookingCalendar />
          </Layout>
        }
      />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/tos" element={<TermsOfService />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <I18nProvider>
        <AppRoutes />
      </I18nProvider>
    </Router>
  );
}

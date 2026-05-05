import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AssessmentForm from './components/AssessmentForm';
import AdminDashboard from './pages/AdminDashboard';
import Calendar from './components/Calendar';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { auth, signInWithGoogle } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, ShieldCheck } from 'lucide-react';
import { handleOAuthCallback, storeTokens } from './services/gmail';

function ProtectedRoute({ children, isAdmin, loading }: { children: React.ReactNode; isAdmin: boolean; loading: boolean }) {
  const [user] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B1E1E]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldCheck size={40} className="text-[#8B1E1E]" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-[#8b1e1e]">Pastor Login</h2>
        <p className="text-gray-500 mb-12">Access the leadership dashboard and calendar management.</p>
        <button
          onClick={() => signInWithGoogle()}
          className="flex items-center justify-center gap-3 w-full py-4 px-8 bg-white border-2 border-[#8B1E1E] text-[#8B1E1E] rounded-full font-bold shadow-sm hover:bg-[#f8eeee] transition-all active:scale-95"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldCheck size={40} className="text-[#8B1E1E]" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-[#8b1e1e]">Access Denied</h2>
        <p className="text-gray-500 mb-6 italic">
          "For even the Son of Man did not come to be served, but to serve..."
        </p>
        <p className="text-gray-600 mb-12">You are logged in as <span className="font-bold">{user.email}</span>, but you do not have permission to access the pastor's dashboard.</p>
        <button
          onClick={() => auth.signOut()}
          className="px-8 py-3 bg-[#8B1E1E] text-white rounded-full font-bold hover:bg-[#641414] transition-colors"
        >
          Sign Out
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
        path="/assessment"
        element={
          <Layout activeTab={getActiveTab()} isAdmin={false}>
            <AssessmentForm />
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
      <AppRoutes />
    </Router>
  );
}

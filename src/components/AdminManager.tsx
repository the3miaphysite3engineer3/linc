import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { ShieldCheck, Plus, Trash2, Mail, Check } from 'lucide-react';

export default function AdminManager({ onAdminsLoaded }: { onAdminsLoaded: (emails: string[]) => void }) {
  const { t, dir } = useI18n();
  const [admins, setAdmins] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const adminsRef = ref(database, 'admins/');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emails = Object.keys(data);
        setAdmins(emails);
        onAdminsLoaded(emails);
      } else {
        const defaults = ['georgejoseph5000@gmail.com', 'georgtawadrous@gmail.com', 'test@example.com'];
        const init: Record<string, boolean> = {};
        defaults.forEach(e => { init[e.toLowerCase().trim()] = true; });
        set(ref(database, 'admins/'), init);
        setAdmins(defaults);
        onAdminsLoaded(defaults);
      }
    });
    return () => unsubscribe();
  }, [onAdminsLoaded]);

  const handleAdd = async () => {
    if (!newEmail || !newEmail.includes('@')) return;
    setLoading(true);
    try {
      const key = newEmail.toLowerCase().trim();
      await set(ref(database, `admins/${key}`), true);
      setNewEmail('');
      setSuccess(t('admin.added'));
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (admins.length <= 1) return;
    try {
      await remove(ref(database, `admins/${email.toLowerCase().trim()}`));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#8B1E1E]/10 rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-[#8B1E1E]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">{t('admin.title')}</h3>
          <p className="text-xs text-gray-400">{t('admin.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={t('admin.emailPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={loading || !newEmail}
          className="px-4 py-2.5 bg-[#8B1E1E] text-white rounded-xl font-bold text-sm hover:bg-[#641414] transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : <><Plus size={14} /> {t('admin.add')}</>}
        </button>
      </div>

      {success && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-xl text-xs font-bold mb-4">
          <Check size={12} />
          {success}
        </motion.div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {admins.map(email => (
          <div key={email} className="flex items-center justify-between px-4 py-2.5 bg-stone-50 rounded-xl text-sm">
            <span className="truncate text-gray-700">{email}</span>
            <button
              onClick={() => handleRemove(email)}
              disabled={admins.length <= 1}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { ShieldCheck, Plus, Trash2, Mail, Check, Crown, User } from 'lucide-react';

type Role = 'superadmin' | 'pastor';

export default function AdminManager({ onAdminsLoaded, currentEmail }: { onAdminsLoaded: (admins: Record<string, Role>) => void; currentEmail: string }) {
  const { dir } = useI18n();
  const [admins, setAdmins] = useState<Record<string, Role>>({});
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('pastor');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const isSuperAdmin = admins[currentEmail?.toLowerCase().trim()] === 'superadmin';

  useEffect(() => {
    const adminsRef = ref(database, 'admins/');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: Record<string, Role> = {};
        Object.keys(data).forEach(k => {
          const email = k.replace(/,/g, '.').toLowerCase().trim();
          const raw = data[k];
          parsed[email] = raw === 'superadmin' ? 'superadmin' : 'pastor';
        });
        setAdmins(parsed);
        onAdminsLoaded(parsed);
      } else {
        const defaults: Record<string, Role> = {};
        defaults['georgejoseph5000@gmail.com'] = 'superadmin';
        defaults['georgtawadrous@gmail.com'] = 'pastor';
        const init: Record<string, string> = {};
        Object.entries(defaults).forEach(([e, r]) => { init[e.toLowerCase().trim().replace(/\./g, ',')] = r; });
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
      const key = newEmail.toLowerCase().trim().replace(/\./g, ',');
      await set(ref(database, `admins/${key}`), newRole);
      setNewEmail('');
      setSuccess(`Added ${newEmail} as ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (admins[email] === 'superadmin' && Object.values(admins).filter(r => r === 'superadmin').length <= 1) return;
    try {
      await remove(ref(database, `admins/${email.toLowerCase().trim().replace(/\./g, ',')}`));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (email: string, role: Role) => {
    try {
      await set(ref(database, `admins/${email.toLowerCase().trim().replace(/\./g, ',')}`), role);
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
          <h3 className="text-lg font-bold text-[#1A1A1A]">Admin Management</h3>
          <p className="text-xs text-gray-400">{isSuperAdmin ? 'Add users and assign roles' : 'Admin team roster'}</p>
        </div>
      </div>

      {isSuperAdmin && (
        <>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Enter email address..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none"
              />
            </div>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as Role)}
              className="px-3 py-2.5 bg-stone-50 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none cursor-pointer"
            >
              <option value="pastor">Pastor</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={loading || !newEmail}
              className="px-4 py-2.5 bg-[#8B1E1E] text-white rounded-xl font-bold text-sm hover:bg-[#641414] transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : <><Plus size={14} /> Add</>}
            </button>
          </div>

          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-xl text-xs font-bold mb-4">
              <Check size={12} />
              {success}
            </motion.div>
          )}
        </>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {Object.entries(admins).map(([email, role]) => (
          <div key={email} className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl text-sm">
            <div className="flex items-center gap-2 truncate">
              {role === 'superadmin' ? <Crown size={14} className="text-amber-500 shrink-0" /> : <User size={14} className="text-gray-400 shrink-0" />}
              <span className="truncate text-gray-700">{email}</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${role === 'superadmin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                {role}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSuperAdmin && email.toLowerCase().trim() !== currentEmail.toLowerCase().trim() && (
                <select
                  value={role}
                  onChange={e => handleRoleChange(email, e.target.value as Role)}
                  className="px-2 py-1 bg-white rounded-lg text-xs font-bold border border-gray-200 cursor-pointer hover:border-gray-300"
                >
                  <option value="pastor">Pastor</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => handleRemove(email)}
                  disabled={role === 'superadmin' && Object.values(admins).filter(r => r === 'superadmin').length <= 1}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useI18n } from '../i18n';
import AdminManager from '../components/AdminManager';
import { LayoutDashboard } from 'lucide-react';
import PageTitle from '../components/PageTitle';

export default function AdminDashboard({ isSuperAdmin, userEmail }: { isSuperAdmin: boolean; userEmail: string }) {
  const { dir } = useI18n();

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={isSuperAdmin ? 'Superadmin — Admin Management' : 'Admin Management'}
        subtitle={isSuperAdmin ? 'Manage roles and access' : 'View admin team'}
        icon={<LayoutDashboard size={22} />}
      />
      <AdminManager onAdminsLoaded={() => {}} currentEmail={userEmail} />
    </div>
  );
}

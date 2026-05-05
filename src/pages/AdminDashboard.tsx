import { useI18n } from '../i18n';
import AdminManager from '../components/AdminManager';
import { LayoutDashboard } from 'lucide-react';
import PageTitle from '../components/PageTitle';

export default function AdminDashboard() {
  const { dir } = useI18n();

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title="Admin Management"
        subtitle="Manage access to the dashboard"
        icon={<LayoutDashboard size={22} />}
      />
      <AdminManager onAdminsLoaded={() => {}} />
    </div>
  );
}

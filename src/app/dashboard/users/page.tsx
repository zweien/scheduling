import { requireAuth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { DutyUserManagement } from '@/components/DutyUserManagement';

export default async function UsersPage() {
  const account = await requireAuth();

  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="值班人员" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <DutyUserManagement canManage={account.role === 'admin'} />
        </div>
      </main>
    </div>
  );
}

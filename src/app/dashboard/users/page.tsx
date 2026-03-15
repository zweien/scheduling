import { requireAdmin } from '@/lib/auth';
import { Header } from '@/components/Header';
import { AccountManagement } from '@/components/AccountManagement';

export default async function UsersPage() {
  await requireAdmin();

  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="用户管理" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <AccountManagement />
        </div>
      </main>
    </div>
  );
}


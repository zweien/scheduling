import { requireAuth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { DutyUserManagement } from '@/components/DutyUserManagement';
import { LeaderManagement } from '@/components/LeaderManagement';
import { Button } from '@/components/ui/button';
import { UsersPageClient } from './client';

export default async function UsersPage() {
  const account = await requireAuth();
  const canManage = account.role === 'admin';

  return <UsersPageClient canManage={canManage} />;
}

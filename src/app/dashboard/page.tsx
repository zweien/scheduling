// src/app/dashboard/page.tsx
import { getCurrentAccount } from '@/lib/auth';
import { DashboardHomeClient } from '@/components/DashboardHomeClient';

export default async function DashboardPage() {
  const account = await getCurrentAccount();

  return <DashboardHomeClient role={account?.role ?? 'user'} />;
}

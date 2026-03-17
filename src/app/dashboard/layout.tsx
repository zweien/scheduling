// src/app/dashboard/layout.tsx
import { requireAuth } from '@/lib/auth';
import { DashboardAccountProvider } from '@/components/DashboardAccountProvider';
import { PendingSuccessToast } from '@/components/PendingSuccessToast';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await requireAuth();

  return (
    <DashboardAccountProvider
      role={account.role}
      username={account.username}
      displayName={account.display_name}
    >
      <PendingSuccessToast />
      {children}
    </DashboardAccountProvider>
  );
}

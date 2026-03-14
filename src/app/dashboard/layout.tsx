// src/app/dashboard/layout.tsx
import { checkAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) {
    redirect('/');
  }

  return <>{children}</>;
}

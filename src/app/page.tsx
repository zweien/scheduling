// src/app/page.tsx
import { checkAuth } from '@/lib/auth';
import { isRegistrationEnabled } from '@/lib/config';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';

export default async function Home() {
  const isLoggedIn = await checkAuth();
  if (isLoggedIn) {
    redirect('/dashboard');
  }

  return <LoginForm registrationEnabled={isRegistrationEnabled()} />;
}

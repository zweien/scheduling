// src/app/page.tsx
import { checkAuth } from '@/lib/auth';
import { isRegistrationEnabled } from '@/lib/config';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const isLoggedIn = await checkAuth();
  if (isLoggedIn) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const errorMap: Record<string, string> = {
    dingtalk_auth_failed: '钉钉登录失败，请重试',
    account_disabled: '账号已被禁用',
  };
  const error = params.error ? (errorMap[params.error] ?? '登录失败，请重试') : null;

  return <LoginForm registrationEnabled={isRegistrationEnabled()} initialError={error} />;
}

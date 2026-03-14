// src/app/actions/auth.ts
'use server';

import { login as doLogin, logout as doLogout } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const password = formData.get('password') as string;
  const result = await doLogin(password);

  if (!result.success) {
    return { error: result.error };
  }

  redirect('/dashboard');
}

export async function logout() {
  await doLogout();
  redirect('/');
}

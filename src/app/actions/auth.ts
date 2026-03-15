// src/app/actions/auth.ts
'use server';

import { login as doLogin, logout as doLogout, register as doRegister } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const result = await doLogin(username, password);

  if (!result.success) {
    return { error: result.error };
  }

  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const username = formData.get('username') as string;
  const displayName = formData.get('displayName') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    return { error: '两次输入的密码不一致' };
  }

  const result = await doRegister({ username, displayName, password });

  if (!result.success) {
    return { error: result.error };
  }

  redirect('/dashboard');
}

export async function logout() {
  await doLogout();
  redirect('/');
}

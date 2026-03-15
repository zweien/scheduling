// src/lib/auth.ts
import { redirect } from 'next/navigation';
import { createAccount, getAccountById, getAccountByUsername, normalizeAccountUsername, updateAccountPassword, verifyAccountPassword } from './accounts';
import { isRegistrationEnabled } from './config';
import { getSession } from './session';
import { addWebLog } from './logs';
import type { Account, AccountRole } from '@/types';

export async function checkAuth(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true && typeof session.accountId === 'number';
}

export async function getCurrentAccount(): Promise<Account | null> {
  const session = await getSession();

  if (!session.isLoggedIn || typeof session.accountId !== 'number') {
    return null;
  }

  const account = getAccountById(session.accountId);
  if (!account || !account.is_active) {
    session.destroy();
    return null;
  }

  return account;
}

export async function requireAuth() {
  const account = await getCurrentAccount();
  if (!account) {
    redirect('/');
  }

  return account;
}

export async function requireAdmin() {
  const account = await requireAuth();
  if (account.role !== 'admin') {
    redirect('/dashboard');
  }

  return account;
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const account = getAccountByUsername(username);

  if (!account || !account.is_active || !verifyAccountPassword(account, password)) {
    return { success: false, error: '用户名或密码错误' };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.accountId = account.id;
  session.username = account.username;
  session.displayName = account.display_name;
  session.role = account.role;
  await session.save();

  await addWebLog('login', `账号: ${account.username}`, undefined, `用户登录 (${account.role})`, {
    username: account.username,
    role: account.role,
  });

  return { success: true };
}

export async function register(input: {
  username: string;
  displayName: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isRegistrationEnabled()) {
    return { success: false, error: '当前未开放注册' };
  }

  const username = normalizeAccountUsername(input.username);
  if (!username || !input.displayName.trim() || !input.password.trim()) {
    return { success: false, error: '请填写所有字段' };
  }

  if (input.password.length < 6) {
    return { success: false, error: '密码长度不能少于6位' };
  }

  if (getAccountByUsername(username)) {
    return { success: false, error: '用户名已存在' };
  }

  const account = createAccount({
    username,
    displayName: input.displayName.trim(),
    password: input.password,
    role: 'user',
  });

  const session = await getSession();
  session.isLoggedIn = true;
  session.accountId = account.id;
  session.username = account.username;
  session.displayName = account.display_name;
  session.role = account.role;
  await session.save();

  await addWebLog('register', `账号: ${account.username}`, undefined, '用户注册', {
    username: account.username,
    role: account.role,
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  await addWebLog('logout', `账号: ${session.username ?? '未知'}`, undefined, '用户退出', {
    username: session.username ?? null,
    role: session.role ?? null,
  });
  session.destroy();
}

export async function updatePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const account = await requireAuth();

  if (!verifyAccountPassword(account, oldPassword)) {
    return { success: false, error: '原密码错误' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: '新密码长度不能少于6位' };
  }

  updateAccountPassword(account.id, newPassword);
  await addWebLog('set_password', `账号: ${account.username}`, '******', '******', {
    username: account.username,
    role: account.role,
  });

  return { success: true };
}

export async function getCurrentAccountRole(): Promise<AccountRole | null> {
  const account = await getCurrentAccount();
  return account?.role ?? null;
}

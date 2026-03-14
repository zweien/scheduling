// src/lib/auth.ts
import db from './db';
import { getSession } from './session';
import { addLog } from './logs';

export async function checkAuth(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  const config = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;

  if (!config || config.value !== password) {
    return { success: false, error: '密码错误' };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  addLog('login', '系统', undefined, '用户登录');

  return { success: true };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  addLog('logout', '系统', undefined, '用户退出');
  session.destroy();
}

export async function updatePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const config = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;

  if (!config || config.value !== oldPassword) {
    return { success: false, error: '原密码错误' };
  }

  db.prepare('UPDATE config SET value = ? WHERE key = ?').run(newPassword, 'password');
  addLog('set_password', '系统', '******', '******');

  return { success: true };
}

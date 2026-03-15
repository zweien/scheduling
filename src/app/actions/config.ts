// src/app/actions/config.ts
'use server';

import { requireAdmin, updatePassword as doUpdatePassword } from '@/lib/auth';
import { isRegistrationEnabled, setRegistrationEnabled } from '@/lib/config';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function updatePasswordAction(oldPassword: string, newPassword: string) {
  return doUpdatePassword(oldPassword, newPassword);
}

export async function getRegistrationEnabledAction() {
  return isRegistrationEnabled();
}

export async function updateRegistrationEnabledAction(enabled: boolean) {
  const account = await requireAdmin();
  setRegistrationEnabled(enabled);
  await addWebLog('toggle_registration', '用户注册', enabled ? '关闭' : '开启', enabled ? '开启' : '关闭', {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard/settings');
  revalidatePath('/');
  revalidatePath('/register');
  return { success: true };
}

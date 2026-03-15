// src/app/actions/config.ts
'use server';

import { requireAdmin, updatePassword as doUpdatePassword } from '@/lib/auth';
import { isRegistrationEnabled, setRegistrationEnabled } from '@/lib/config';
import { addLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function updatePasswordAction(oldPassword: string, newPassword: string) {
  return doUpdatePassword(oldPassword, newPassword);
}

export async function getRegistrationEnabledAction() {
  return isRegistrationEnabled();
}

export async function updateRegistrationEnabledAction(enabled: boolean) {
  await requireAdmin();
  setRegistrationEnabled(enabled);
  addLog('toggle_registration', '用户注册', enabled ? '关闭' : '开启', enabled ? '开启' : '关闭');
  revalidatePath('/dashboard/settings');
  revalidatePath('/');
  revalidatePath('/register');
  return { success: true };
}

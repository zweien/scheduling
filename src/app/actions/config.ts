// src/app/actions/config.ts
'use server';

import { requireAdmin, updatePassword as doUpdatePassword } from '@/lib/auth';
import { getDefaultScheduleDays, isRegistrationEnabled, setDefaultScheduleDays, setRegistrationEnabled } from '@/lib/config';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function updatePasswordAction(oldPassword: string, newPassword: string) {
  return doUpdatePassword(oldPassword, newPassword);
}

export async function getRegistrationEnabledAction() {
  return isRegistrationEnabled();
}

export async function getDefaultScheduleDaysAction() {
  return getDefaultScheduleDays();
}

export async function updateDefaultScheduleDaysAction(days: number) {
  const account = await requireAdmin();
  const previousDays = getDefaultScheduleDays();

  try {
    setDefaultScheduleDays(days);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }

  const nextDays = getDefaultScheduleDays();
  await addWebLog(
    'update_default_schedule_days',
    '默认排班天数',
    String(previousDays),
    String(nextDays),
    {
      username: account.username,
      role: account.role,
    }
  );
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { success: true };
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

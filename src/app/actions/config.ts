// src/app/actions/config.ts
'use server';

import { updatePassword as doUpdatePassword } from '@/lib/auth';

export async function updatePasswordAction(oldPassword: string, newPassword: string) {
  return doUpdatePassword(oldPassword, newPassword);
}

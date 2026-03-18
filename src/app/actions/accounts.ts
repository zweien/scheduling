'use server';

import { revalidatePath } from 'next/cache';
import { countAdminAccounts, createAccount, getAccountById, listAccounts, updateAccountActive, updateAccountPassword, updateAccountRole } from '@/lib/accounts';
import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import type { AccountRole } from '@/types';

export async function getAccounts() {
  await requireAdmin();
  return listAccounts();
}

export async function createAccountAction(input: {
  username: string;
  displayName: string;
  password: string;
  role: AccountRole;
}) {
  const current = await requireAdmin();

  if (!input.username.trim() || !input.displayName.trim() || !input.password.trim()) {
    return { success: false, error: '请填写所有字段' };
  }

  if (input.password.length < 6) {
    return { success: false, error: '密码长度不能少于6位' };
  }

  try {
    const account = createAccount(input);
    await addWebLog('add_account', `账号: ${account.username}`, undefined, account.role, {
      username: current.username,
      role: current.role,
    });
    revalidatePath('/dashboard/users');
    return { success: true, account };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

export async function updateAccountRoleAction(accountId: number, role: AccountRole) {
  const current = await requireAdmin();
  const updated = updateAccountRole(accountId, role);

  if (!updated) {
    return { success: false, error: '账号不存在' };
  }

  if (current.id === accountId && role !== 'admin') {
    if (countAdminAccounts() === 0) {
      updateAccountRole(accountId, 'admin');
      return { success: false, error: '系统至少需要一位管理员' };
    }
  }

  await addWebLog('change_account_role', `账号: ${updated.username}`, undefined, updated.role, {
    username: current.username,
    role: current.role,
  });
  revalidatePath('/dashboard/users');
  return { success: true, account: updated };
}

export async function updateAccountActiveAction(accountId: number, isActive: boolean) {
  const current = await requireAdmin();

  if (current.id === accountId && !isActive) {
    return { success: false, error: '不能停用当前管理员账号' };
  }

  const updated = updateAccountActive(accountId, isActive);

  if (!updated) {
    return { success: false, error: '账号不存在' };
  }

  if (!isActive && updated.role === 'admin' && countAdminAccounts() === 0) {
    updateAccountActive(accountId, true);
    return { success: false, error: '系统至少需要一位管理员' };
  }

  await addWebLog('toggle_account_active', `账号: ${updated.username}`, isActive ? '停用' : '启用', isActive ? '启用' : '停用', {
    username: current.username,
    role: current.role,
  });
  revalidatePath('/dashboard/users');
  return { success: true, account: updated };
}

export async function adminUpdateAccountPasswordAction(accountId: number, newPassword: string) {
  const current = await requireAdmin();

  if (!newPassword.trim()) {
    return { success: false, error: '请填写新密码' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: '密码长度不能少于6位' };
  }

  const targetAccount = getAccountById(accountId);
  if (!targetAccount) {
    return { success: false, error: '账号不存在' };
  }

  updateAccountPassword(accountId, newPassword);
  await addWebLog(
    'set_password',
    `账号: ${targetAccount.username}`,
    '******',
    '******',
    { username: current.username, role: current.role }
  );
  revalidatePath('/dashboard/accounts');
  return { success: true };
}

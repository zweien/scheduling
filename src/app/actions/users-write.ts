'use server';

import { createUser, deleteUser, getUserById, reorderUsers, setUserActive, updateUserProfile } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';
import type { UserCategory, UserOrganization } from '@/types';

export async function addUser(name: string) {
  const account = await requireAdmin();
  const user = createUser(name);
  await addWebLog('add_user', `人员: ${name}`, undefined, undefined, {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
  return user;
}

export async function createDutyUser(input: {
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  notes: string;
}) {
  const account = await requireAdmin();

  if (!input.name.trim()) {
    return { success: false, error: '姓名不能为空' };
  }

  const user = createUser(input.name.trim(), {
    organization: input.organization,
    category: input.category,
    notes: input.notes,
  });

  await addWebLog('add_user', `人员: ${user.name}`, undefined, `${user.organization}/${user.category}`, {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, user };
}

export async function removeUser(id: number, name: string) {
  const account = await requireAdmin();
  deleteUser(id);
  await addWebLog('delete_user', `人员: ${name}`, undefined, undefined, {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
}

export async function updateUserOrder(userIds: number[]) {
  const account = await requireAdmin();
  reorderUsers(userIds);
  await addWebLog('reorder_users', '人员排序', undefined, undefined, {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
}

export async function updateUserActiveAction(id: number, isActive: boolean) {
  const account = await requireAdmin();
  const user = getUserById(id);
  if (!user) return;

  setUserActive(id, isActive);
  await addWebLog('toggle_user_active', `人员: ${user.name}`, isActive ? '不参与' : '参与', isActive ? '参与' : '不参与', {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/users');
}

export async function updateDutyUserProfile(input: {
  id: number;
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  notes: string;
}) {
  const account = await requireAdmin();
  const current = getUserById(input.id);

  if (!current) {
    return { success: false, error: '人员不存在' };
  }

  if (!input.name.trim()) {
    return { success: false, error: '姓名不能为空' };
  }

  const updated = updateUserProfile(input.id, {
    name: input.name.trim(),
    organization: input.organization,
    category: input.category,
    notes: input.notes,
  });

  await addWebLog(
    'update_user_profile',
    `人员: ${current.name}`,
    `${current.organization}/${current.category}/${current.notes ?? ''}`,
    `${updated?.organization}/${updated?.category}/${updated?.notes ?? ''}`,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard/users');
  return { success: true, user: updated };
}

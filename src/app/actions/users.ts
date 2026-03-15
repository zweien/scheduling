// src/app/actions/users.ts
'use server';

import { getActiveUsers, getAllUsers, createUser, deleteUser, reorderUsers, setUserActive, getUserById } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function getUsers() {
  return getAllUsers();
}

export async function getAssignableUsers() {
  return getActiveUsers();
}

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
  // isActive 是新状态：true=参与，false=不参与
  await addWebLog('toggle_user_active', `人员: ${user.name}`, isActive ? '不参与' : '参与', isActive ? '参与' : '不参与', {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
}

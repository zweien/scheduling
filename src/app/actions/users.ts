// src/app/actions/users.ts
'use server';

import { getAllUsers, createUser, deleteUser, reorderUsers, setUserActive, getUserById } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function getUsers() {
  return getAllUsers();
}

export async function addUser(name: string) {
  await requireAdmin();
  const user = createUser(name);
  addLog('add_user', `人员: ${name}`);
  revalidatePath('/dashboard');
  return user;
}

export async function removeUser(id: number, name: string) {
  await requireAdmin();
  deleteUser(id);
  addLog('delete_user', `人员: ${name}`);
  revalidatePath('/dashboard');
}

export async function updateUserOrder(userIds: number[]) {
  await requireAdmin();
  reorderUsers(userIds);
  addLog('reorder_users', '人员排序');
  revalidatePath('/dashboard');
}

export async function updateUserActiveAction(id: number, isActive: boolean) {
  await requireAdmin();
  const user = getUserById(id);
  if (!user) return;

  setUserActive(id, isActive);
  // isActive 是新状态：true=参与，false=不参与
  addLog('toggle_user_active', `人员: ${user.name}`, isActive ? '不参与' : '参与', isActive ? '参与' : '不参与');
  revalidatePath('/dashboard');
}

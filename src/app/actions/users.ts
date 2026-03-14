// src/app/actions/users.ts
'use server';

import { getAllUsers, createUser, deleteUser, reorderUsers } from '@/lib/users';
import { addLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function getUsers() {
  return getAllUsers();
}

export async function addUser(name: string) {
  const user = createUser(name);
  addLog('add_user', `人员: ${name}`);
  revalidatePath('/dashboard');
  return user;
}

export async function removeUser(id: number, name: string) {
  deleteUser(id);
  addLog('delete_user', `人员: ${name}`);
  revalidatePath('/dashboard');
}

export async function updateUserOrder(userIds: number[]) {
  reorderUsers(userIds);
  addLog('reorder_users', '人员排序');
  revalidatePath('/dashboard');
}

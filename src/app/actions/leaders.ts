// src/app/actions/leaders.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import {
  createLeader as doCreateLeader,
  deleteLeader as doDeleteLeader,
  getAllLeaders,
  getLeaderScheduleCount,
  reorderLeaders as doReorderLeaders,
  setLeaderActive as doSetLeaderActive,
} from '@/lib/leaders';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function getLeaders() {
  return getAllLeaders();
}

export async function createLeader(name: string) {
  const account = await requireAdmin();

  const leader = doCreateLeader(name);
  await addWebLog('add_leader', `领导: ${leader.name}`, undefined, '已添加', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, leader };
}

export async function deleteLeaderAction(id: number) {
  const account = await requireAdmin();

  const scheduleCount = getLeaderScheduleCount(id);
  const leaders = getAllLeaders();
  const leader = leaders.find(l => l.id === id);

  doDeleteLeader(id);

  await addWebLog('delete_leader', `领导: ${leader?.name ?? id}`, `${scheduleCount} 条排班`, '已删除', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, deletedScheduleCount: scheduleCount };
}

export async function reorderLeadersAction(leaderIds: number[]) {
  const account = await requireAdmin();

  doReorderLeaders(leaderIds);
  await addWebLog('reorder_leaders', '调整值班领导顺序', undefined, '已完成', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function toggleLeaderActiveAction(id: number, isActive: boolean) {
  const account = await requireAdmin();

  doSetLeaderActive(id, isActive);
  await addWebLog('toggle_leader_active', `领导 ID: ${id}`, isActive ? '禁用' : '启用', isActive ? '启用' : '禁用', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function getLeaderScheduleCountAction(id: number) {
  await requireAdmin();
  return getLeaderScheduleCount(id);
}

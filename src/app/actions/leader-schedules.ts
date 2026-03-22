// src/app/actions/leader-schedules.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';
import {
  getLeaderSchedulesByDateRange,
  setLeaderSchedule,
  deleteLeaderSchedule,
  getDefaultLeaderId,
  setDefaultLeaderId,
} from '@/lib/leader-schedules';
import { getLeaderById, getAllLeaders } from '@/lib/leaders';

export async function getLeaderSchedules(startDate: string, endDate: string) {
  return getLeaderSchedulesByDateRange(startDate, endDate);
}

export async function replaceLeaderSchedule(date: string, leaderId: number) {
  const account = await requireAdmin();
  const schedules = getLeaderSchedulesByDateRange(date, date);
  const previous = schedules[0];
  const oldLeader = previous ? getLeaderById(previous.leader_id) : null;
  const newLeader = getLeaderById(leaderId);

  if (!newLeader) {
    return { success: false, error: '找不到目标值班领导' };
  }

  setLeaderSchedule(date, leaderId, true);

  await addWebLog(
    'replace_leader_schedule',
    `日期: ${date}`,
    oldLeader?.name ?? '无',
    newLeader.name,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function removeLeaderSchedule(date: string) {
  const account = await requireAdmin();
  const schedules = getLeaderSchedulesByDateRange(date, date);
  const current = schedules[0];

  if (!current) {
    return { success: false, error: '找不到值班领导排班记录' };
  }

  deleteLeaderSchedule(date);
  await addWebLog(
    'delete_leader_schedule',
    `日期: ${date}`,
    current.leader.name,
    '已删除',
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getDefaultLeader() {
  const id = getDefaultLeaderId();
  return id ? getLeaderById(id) : null;
}

export async function setDefaultLeaderAction(leaderId: number | null) {
  const account = await requireAdmin();

  const previousId = getDefaultLeaderId();
  const previousLeader = previousId ? getLeaderById(previousId) : null;
  const newLeader = leaderId ? getLeaderById(leaderId) : null;

  setDefaultLeaderId(leaderId);

  await addWebLog(
    'set_default_leader',
    '默认值班领导',
    previousLeader?.name ?? '无',
    newLeader?.name ?? '无',
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function getLeadersForSelect() {
  return getAllLeaders();
}

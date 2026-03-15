// src/app/actions/schedule.ts
'use server';

import { generateSchedule as doGenerateSchedule } from '@/lib/schedule';
import { getSchedulesByDateRange, setSchedule, getScheduleStats } from '@/lib/schedules';
import { getUserById } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function generateScheduleAction(startDate: string, endDate?: string) {
  await requireAdmin();
  try {
    doGenerateSchedule(startDate, endDate);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getSchedules(startDate: string, endDate: string) {
  return getSchedulesByDateRange(startDate, endDate);
}

export async function replaceSchedule(date: string, newUserId: number) {
  await requireAdmin();
  const oldSchedules = getSchedulesByDateRange(date, date);
  const oldSchedule = oldSchedules[0];
  const oldUser = oldSchedule ? getUserById(oldSchedule.user_id) : null;
  const newUser = getUserById(newUserId);

  setSchedule(date, newUserId, true);

  addLog(
    'replace_schedule',
    `日期: ${date}`,
    oldUser?.name ?? '无',
    newUser?.name ?? '无'
  );

  revalidatePath('/dashboard');
}

export async function swapSchedules(date1: string, date2: string) {
  await requireAdmin();
  const minDate = date1 < date2 ? date1 : date2;
  const maxDate = date1 > date2 ? date1 : date2;
  const schedules = getSchedulesByDateRange(minDate, maxDate);
  const s1 = schedules.find(s => s.date === date1);
  const s2 = schedules.find(s => s.date === date2);

  if (!s1 || !s2) {
    return { success: false, error: '找不到排班记录' };
  }

  setSchedule(date1, s2.user_id, true);
  setSchedule(date2, s1.user_id, true);

  addLog(
    'swap_schedule',
    `交换: ${date1} <-> ${date2}`,
    `${s1.user.name} <-> ${s2.user.name}`,
    `${s2.user.name} <-> ${s1.user.name}`
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getStats(startDate?: string, endDate?: string) {
  const stats = getScheduleStats(startDate, endDate);
  return stats.map(s => ({
    userId: s.userId,
    userName: getUserById(s.userId)?.name ?? '未知',
    count: s.count,
    dates: s.dates,
  }));
}

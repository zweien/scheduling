// src/app/actions/schedule.ts
'use server';

import { generateSchedule as doGenerateSchedule, generateScheduleFromDate } from '@/lib/schedule';
import {
  batchDeleteSchedules as doBatchDeleteSchedules,
  deleteSchedule,
  getScheduleByDate,
  getSchedulesByDateRange,
  getSchedulesByDates,
  getScheduleStats,
  setSchedule,
} from '@/lib/schedules';
import { getUserById, getUserByName } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { moveScheduleWithReason, swapSchedulesWithReason } from '@/lib/schedule-adjustments';
import { revalidatePath } from 'next/cache';
import { buildScheduleTemplateWorkbookByType } from '@/lib/imports/schedule-import-template';
import { importScheduleRows, previewScheduleImport } from '@/lib/imports/schedule-import';
import { backfillLeaderSchedules, getDefaultLeaderId, getLeaderSchedulesByDates, setLeaderSchedule } from '@/lib/leader-schedules';
import type { AutoScheduleStartMode, ScheduleImportStrategy, ScheduleImportTemplateType } from '@/types';
import type { ScheduleImportPreview } from '@/types';
import type { ScheduleImportSuccessResult } from '@/lib/imports/schedule-import';

type BinaryExportResponse = {
  fileName: string;
  mimeType: string;
  content: string;
};

type ScheduleImportActionFailure = {
  success: false;
  error: string;
  preview: ScheduleImportPreview;
};

function decodeBase64File(fileBase64: string) {
  const content = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  return Buffer.from(content, 'base64');
}

export async function generateScheduleAction(startDate: string, endDate?: string) {
  const account = await requireAdmin();
  try {
    doGenerateSchedule(startDate, endDate);
    await addWebLog('generate_schedule', `日期: ${startDate} ~ ${endDate ?? '自动推导'}`, undefined, '已生成', {
      username: account.username,
      role: account.role,
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function autoScheduleFromDateAction(startDate: string, days: number, startMode: AutoScheduleStartMode) {
  const account = await requireAdmin();

  try {
    if (getScheduleByDate(startDate)) {
      return { success: false, error: '起始日期已有排班' };
    }

    const result = generateScheduleFromDate(startDate, days, startMode);
    await addWebLog(
      'auto_schedule_from_date',
      `起始日期: ${startDate}`,
      undefined,
      `已自动安排 ${result.days} 天（${result.startDate} ~ ${result.endDate}）`,
      { username: account.username, role: account.role }
    );
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
  const account = await requireAdmin();
  const oldSchedules = getSchedulesByDateRange(date, date);
  const oldSchedule = oldSchedules[0];
  const oldUser = oldSchedule ? getUserById(oldSchedule.user_id) : null;
  const newUser = getUserById(newUserId);

  setSchedule(date, newUserId, true);

  await addWebLog(
    'replace_schedule',
    `日期: ${date}`,
    oldUser?.name ?? '无',
    newUser?.name ?? '无',
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
}

export async function replaceSchedules(dates: string[], newUserId: number) {
  const account = await requireAdmin();
  const uniqueDates = [...new Set(dates)].sort();

  if (uniqueDates.length === 0) {
    return { success: false, error: '请选择要编辑的日期' };
  }

  const schedules = getSchedulesByDates(uniqueDates);
  if (schedules.length === 0) {
    return { success: false, error: '所选日期没有排班记录' };
  }

  const newUser = getUserById(newUserId);
  if (!newUser) {
    return { success: false, error: '找不到目标值班人员' };
  }

  for (const schedule of schedules) {
    setSchedule(schedule.date, newUserId, true, {
      originalUserId: schedule.original_user_id ?? schedule.user_id,
    });
  }

  await addWebLog(
    'batch_replace_schedules',
    `批量替换日期: ${schedules.map(schedule => schedule.date).join(', ')}`,
    schedules.map(schedule => `${schedule.date}: ${schedule.user.name}`).join('，'),
    `已统一替换为 ${newUser.name}（${schedules.length} 条）`,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true, updatedCount: schedules.length };
}

export async function removeSchedule(date: string) {
  const account = await requireAdmin();
  const current = getSchedulesByDateRange(date, date)[0];

  if (!current) {
    return { success: false, error: '找不到排班记录' };
  }

  deleteSchedule(date);
  await addWebLog(
    'delete_schedule',
    `日期: ${date}`,
    current.user.name,
    '已删除',
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function batchDeleteSchedules(dates: string[]) {
  const account = await requireAdmin();
  const uniqueDates = [...new Set(dates)].sort();

  if (uniqueDates.length === 0) {
    return { success: false, error: '请选择要删除的日期' };
  }

  const schedules = getSchedulesByDates(uniqueDates);

  if (schedules.length === 0) {
    return { success: false, error: '所选日期没有排班记录' };
  }

  const deletedCount = doBatchDeleteSchedules(schedules.map(schedule => schedule.date));
  const summary = schedules.map(schedule => `${schedule.date}: ${schedule.user.name}`).join('，');

  await addWebLog(
    'batch_delete_schedules',
    `批量删除日期: ${schedules.map(schedule => schedule.date).join(', ')}`,
    summary,
    `已删除 ${deletedCount} 条排班`,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true, deletedCount };
}

export async function moveSchedule(fromDate: string, toDate: string, reason?: string) {
  const account = await requireAdmin();
  const result = await moveScheduleWithReason(
    { fromDate, toDate, reason: reason ?? '' },
    {
      getScheduleByDate,
      setSchedule,
      deleteSchedule,
      async addLog(entry) {
        await addWebLog(
          entry.action,
          entry.target,
          entry.oldValue,
          entry.newValue,
          { username: account.username, role: account.role },
          entry.reason
        );
      },
    }
  );

  if (!result.success) {
    return result;
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function moveScheduleDirect(fromDate: string, toDate: string) {
  const account = await requireAdmin();
  const schedules = getSchedulesByDateRange(
    fromDate < toDate ? fromDate : toDate,
    fromDate > toDate ? fromDate : toDate
  );
  const source = schedules.find(schedule => schedule.date === fromDate);
  const target = schedules.find(schedule => schedule.date === toDate);

  if (!source) {
    return { success: false, error: '起始日期没有排班记录' };
  }

  if (target) {
    return { success: false, error: '目标日期已有排班记录' };
  }

  setSchedule(toDate, source.user_id, true, {
    originalUserId: source.original_user_id ?? source.user_id,
  });
  deleteSchedule(fromDate);

  await addWebLog(
    'move_schedule',
    `移动: ${fromDate} -> ${toDate}`,
    `${fromDate}: ${source.user.name}`,
    `${toDate}: ${source.user.name}`,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function swapSchedules(date1: string, date2: string, reason?: string) {
  const account = await requireAdmin();

  const result = await swapSchedulesWithReason(
    { date1, date2, reason: reason ?? '' },
    {
      getScheduleByDate,
      setSchedule,
      deleteSchedule,
      async addLog(entry) {
        await addWebLog(
          entry.action,
          entry.target,
          entry.oldValue,
          entry.newValue,
          { username: account.username, role: account.role },
          entry.reason
        );
      },
    }
  );

  if (!result.success) {
    return result;
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function swapSchedulesDirect(date1: string, date2: string) {
  const account = await requireAdmin();
  const minDate = date1 < date2 ? date1 : date2;
  const maxDate = date1 > date2 ? date1 : date2;
  const schedules = getSchedulesByDateRange(minDate, maxDate);
  const s1 = schedules.find(s => s.date === date1);
  const s2 = schedules.find(s => s.date === date2);

  if (!s1 || !s2) {
    return { success: false, error: '找不到排班记录' };
  }

  setSchedule(date1, s2.user_id, true, {
    originalUserId: s1.original_user_id ?? s1.user_id,
  });
  setSchedule(date2, s1.user_id, true, {
    originalUserId: s2.original_user_id ?? s2.user_id,
  });

  await addWebLog(
    'swap_schedule',
    `交换: ${date1} <-> ${date2}`,
    `${s1.user.name} <-> ${s2.user.name}`,
    `${s2.user.name} <-> ${s1.user.name}`,
    { username: account.username, role: account.role }
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

export async function downloadScheduleTemplateAction(
  templateType: ScheduleImportTemplateType = 'standard',
  monthKey?: string
): Promise<BinaryExportResponse> {
  await requireAdmin();
  const workbook = await buildScheduleTemplateWorkbookByType(templateType, monthKey);
  const normalizedMonth = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : undefined;

  return {
    fileName: templateType === 'calendar'
      ? `排班月历模板${normalizedMonth ? `-${normalizedMonth}` : ''}.xlsx`
      : '排班导入模板.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: workbook.toString('base64'),
  };
}

export async function previewScheduleImportAction(fileBase64: string, templateType: ScheduleImportTemplateType = 'standard') {
  await requireAdmin();
  const fileBuffer = decodeBase64File(fileBase64);

  return previewScheduleImport(fileBuffer, {
    getUserByName,
    getSchedulesByDates,
  }, templateType);
}

export async function importScheduleAction(
  fileBase64: string,
  strategy: ScheduleImportStrategy,
  templateType: ScheduleImportTemplateType = 'standard'
): Promise<ScheduleImportSuccessResult | ScheduleImportActionFailure> {
  const account = await requireAdmin();
  const fileBuffer = decodeBase64File(fileBase64);
  const result = await importScheduleRows(fileBuffer, strategy, {
    getUserByName,
    getSchedulesByDates,
    setSchedule,
    getDefaultLeaderId,
    getLeaderSchedulesByDates,
    setLeaderSchedule,
  }, templateType);

  if (!result.success) {
    return {
      success: false,
      error: '导入文件校验失败，请先修正后再导入',
      preview: result.preview,
    };
  }

  const summaryText = result.markedOnly
    ? `仅标记冲突 ${result.conflictCount} 条，未执行导入`
    : `成功 ${result.importedCount} 条，跳过 ${result.skippedCount} 条，覆盖 ${result.overwrittenCount} 条，冲突 ${result.conflictCount} 条`;

  await addWebLog(
    'import_schedules',
    '排班批量导入',
    undefined,
    `${strategy}: ${summaryText}`,
    { username: account.username, role: account.role }
  );

  if (!result.markedOnly) {
    revalidatePath('/dashboard');
  }

  return result;
}

export async function backfillLeaderSchedulesAction(): Promise<{ success: boolean; error?: string; filledCount?: number }> {
  const account = await requireAdmin();

  try {
    const filledCount = backfillLeaderSchedules();
    await addWebLog(
      'backfill_leader_schedules',
      '批量补全值班领导',
      undefined,
      `已补全 ${filledCount} 条`,
      { username: account.username, role: account.role }
    );
    revalidatePath('/dashboard');
    return { success: true, filledCount };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

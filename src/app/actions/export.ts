// src/app/actions/export.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { getSchedulesByDates, getSchedulesByDateRange } from '@/lib/schedules';
import { buildCalendarWorkbook, buildSelectedSchedulesWorkbook } from '@/lib/export/calendar-xlsx';

export async function exportToCSV(startDate: string, endDate: string): Promise<string> {
  const schedules = getSchedulesByDateRange(startDate, endDate);

  const header = '日期,星期,值班人员,备注\n';
  const rows = schedules.map(s => {
    const date = new Date(s.date);
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    const note = s.is_manual ? '手动调整' : '';
    return `${s.date},星期${weekDay},${s.user.name},${note}`;
  });

  return header + rows.join('\n');
}

export async function exportToJSON(startDate: string, endDate: string): Promise<string> {
  const schedules = getSchedulesByDateRange(startDate, endDate);
  return JSON.stringify(schedules, null, 2);
}

export async function exportToXLSX(startDate: string, endDate: string) {
  const schedules = getSchedulesByDateRange(startDate, endDate);
  const workbook = await buildCalendarWorkbook(startDate, endDate, schedules);

  return {
    fileName: `排班日历_${startDate}_${endDate}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: workbook.toString('base64'),
  };
}

export async function exportSelectedSchedulesToXLSX(dates: string[]) {
  await requireAdmin();

  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length === 0) {
    throw new Error('请选择要导出的日期');
  }

  const schedules = getSchedulesByDates(uniqueDates);
  if (schedules.length === 0) {
    throw new Error('所选日期没有排班记录');
  }

  const startDate = uniqueDates[0];
  const endDate = uniqueDates[uniqueDates.length - 1];
  const workbook = await buildSelectedSchedulesWorkbook(schedules);

  return {
    fileName: `排班日历_已选日期_${startDate}_${endDate}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: workbook.toString('base64'),
  };
}

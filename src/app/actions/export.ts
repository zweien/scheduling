// src/app/actions/export.ts
'use server';

import { getSchedulesByDateRange } from '@/lib/schedules';
import { buildCalendarWorkbook } from '@/lib/export/calendar-xlsx';

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

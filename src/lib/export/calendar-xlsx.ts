import ExcelJS from 'exceljs';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithUser } from '@/types';

const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function monthRange(startDate: string, endDate: string) {
  const start = startOfMonth(new Date(startDate));
  const end = startOfMonth(new Date(endDate));
  const months: Date[] = [];

  for (let current = start; current <= end; current = addMonths(current, 1)) {
    months.push(current);
  }

  return months;
}

function buildScheduleMap(schedules: ScheduleWithUser[]) {
  return new Map(schedules.map(schedule => [schedule.date, schedule]));
}

function formatCell(day: Date, schedule?: ScheduleWithUser) {
  const lines = [format(day, 'M/d')];

  if (schedule) {
    lines.push(schedule.user.name);
    if (schedule.is_manual) {
      lines.push('手动调整');
    }
  }

  return lines.join('\n');
}

export async function buildCalendarWorkbook(startDate: string, endDate: string, schedules: ScheduleWithUser[] = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'scheduling';
  workbook.created = new Date();

  const scheduleMap = buildScheduleMap(schedules);

  for (const month of monthRange(startDate, endDate)) {
    const sheet = workbook.addWorksheet(format(month, 'yyyy-MM'));
    const calendarStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = format(month, 'yyyy年M月值班日历', { locale: zhCN });
    sheet.getCell('A1').font = { name: 'Arial', size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    weekLabels.forEach((label, index) => {
      const cell = sheet.getCell(3, index + 1);
      cell.value = label;
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7EEF8' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        left: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        right: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      };
    });

    days.forEach((day, index) => {
      const row = Math.floor(index / 7) + 4;
      const column = (index % 7) + 1;
      const dateKey = format(day, 'yyyy-MM-dd');
      const schedule = scheduleMap.get(dateKey);
      const cell = sheet.getCell(row, column);

      cell.value = isSameMonth(day, month) ? formatCell(day, schedule) : '';
      cell.font = { name: 'Arial', size: 11, color: { argb: isSameMonth(day, month) ? 'FF0F172A' : 'FFA1A1AA' } };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        left: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        right: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: schedule?.is_manual ? 'FFFDF2D6' : 'FFFFFFFF' },
      };
    });

    for (let column = 1; column <= 7; column += 1) {
      sheet.getColumn(column).width = 18;
    }

    for (let row = 4; row <= Math.ceil(days.length / 7) + 3; row += 1) {
      sheet.getRow(row).height = 54;
    }

    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.3,
        bottom: 0.3,
        header: 0.2,
        footer: 0.2,
      },
      printArea: `A1:G${Math.ceil(days.length / 7) + 3}`,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

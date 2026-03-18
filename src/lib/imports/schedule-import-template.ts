import ExcelJS from 'exceljs';
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import type { ScheduleImportTemplateType } from '@/types';

export const SCHEDULE_TEMPLATE_HEADERS = [
  '日期（必填，YYYY-MM-DD）',
  '值班人员姓名（必填）',
  '是否手动调整（必填，是/否）',
  '备注（选填）',
] as const;

export async function buildScheduleImportTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('排班导入模板');

  sheet.addRow([...SCHEDULE_TEMPLATE_HEADERS]);
  sheet.addRow(['2026-03-20', '张三', '否', '示例备注']);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function resolveCalendarTemplateMonth(monthKey?: string) {
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const resolved = new Date(`${monthKey}-01T00:00:00`);
    if (!Number.isNaN(resolved.getTime())) {
      return resolved;
    }
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toExcelSerial(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) + 25569;
}

export async function buildCalendarScheduleImportTemplateWorkbook(monthKey?: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  const sampleMonth = resolveCalendarTemplateMonth(monthKey);
  const monthStart = startOfMonth(sampleMonth);
  const monthEnd = endOfMonth(sampleMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  sheet.addRow([]);
  sheet.addRow([`${format(sampleMonth, 'yyyy年MM月')}XXX值班表`]);
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A2').font = { name: 'Arial', bold: true, size: 14 };

  sheet.addRow(['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']);

  let cursor = calendarStart;
  while (cursor <= monthEnd) {
    const dateRow = ['日  期'];
    const userRow = ['值班员'];

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const currentDate = addDays(cursor, dayOffset);
      if (currentDate < monthStart || currentDate > monthEnd) {
        dateRow.push('');
      } else {
        dateRow.push(toExcelSerial(currentDate));
      }
      userRow.push('');
    }

    sheet.addRow(dateRow);
    sheet.addRow(userRow);
    cursor = addDays(cursor, 7);
  }

  for (let column = 1; column <= 8; column += 1) {
    sheet.getColumn(column).width = 19.96;
  }

  for (let row = 4; row <= sheet.rowCount; row += 2) {
    for (let column = 2; column <= 8; column += 1) {
      const cell = sheet.getRow(row).getCell(column);
      if (typeof cell.value === 'number') {
        cell.numFmt = 'yyyy-mm-dd';
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildScheduleTemplateWorkbookByType(templateType: ScheduleImportTemplateType, monthKey?: string) {
  if (templateType === 'calendar') {
    return buildCalendarScheduleImportTemplateWorkbook(monthKey);
  }

  return buildScheduleImportTemplateWorkbook();
}

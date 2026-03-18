import ExcelJS from 'exceljs';
import { format } from 'date-fns';

const WEEKDAY_HEADER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const CALENDAR_COLUMN_START = 2;
const CALENDAR_COLUMN_END = 8;

function normalizeCellValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && value && 'text' in value) {
    return String(value.text ?? '').trim();
  }

  return String(value).trim();
}

function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function normalizeCalendarDate(value) {
  if (typeof value === 'number') {
    return format(excelSerialToDate(value), 'yyyy-MM-dd');
  }

  if (value instanceof Date) {
    return format(value, 'yyyy-MM-dd');
  }

  const normalized = normalizeCellValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
}

function findWeekdayHeaderRow(sheet) {
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const values = WEEKDAY_HEADER.map((_, index) =>
      normalizeCellValue(sheet.getRow(rowNumber).getCell(index + CALENDAR_COLUMN_START).value)
    );

    if (values.every((value, index) => value === WEEKDAY_HEADER[index])) {
      return rowNumber;
    }
  }

  return null;
}

export async function parseCalendarScheduleImport(fileBuffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer);
  } catch {
    return {
      rows: [],
      issues: [{ row: 1, field: '文件', message: '无法解析导入文件，请确认使用模板生成的 .xlsx 文件' }],
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      rows: [],
      issues: [{ row: 1, field: '文件', message: '未找到工作表' }],
    };
  }

  const headerRowNumber = findWeekdayHeaderRow(sheet);
  if (!headerRowNumber) {
    return {
      rows: [],
      issues: [{ row: 1, field: '表头', message: '未找到星期头' }],
    };
  }

  const rows = [];
  const issues = [];
  const seenDates = new Set();
  let targetMonth = null;

  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 2) {
    const dateRow = sheet.getRow(rowNumber);
    const userRow = sheet.getRow(rowNumber + 1);
    if (!userRow.hasValues) {
      break;
    }

    for (let column = CALENDAR_COLUMN_START; column <= CALENDAR_COLUMN_END; column += 1) {
      const rawDate = dateRow.getCell(column).value;
      const rawUserName = normalizeCellValue(userRow.getCell(column).value);
      const normalizedDate = normalizeCalendarDate(rawDate);

      if (!normalizedDate && !rawUserName) {
        continue;
      }

      if (!normalizedDate) {
        issues.push({ row: rowNumber, field: '日期', message: '日期不能为空或格式不正确' });
        continue;
      }

      if (!rawUserName) {
        // 空白值班员表示该日期不导入，保留系统现有值。
        continue;
      }

      const monthKey = normalizedDate.slice(0, 7);
      if (!targetMonth) {
        targetMonth = monthKey;
      } else if (monthKey !== targetMonth) {
        issues.push({ row: rowNumber, field: '日期', message: '月历模板中的日期必须属于同一个自然月' });
        continue;
      }

      if (seenDates.has(normalizedDate)) {
        issues.push({ row: rowNumber, field: '日期', message: '存在重复日期' });
        continue;
      }

      seenDates.add(normalizedDate);
      rows.push({
        rowNumber: rowNumber + 1,
        date: normalizedDate,
        userName: rawUserName,
        isManual: true,
        notes: '',
      });
    }
  }

  return { rows, issues };
}

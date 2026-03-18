import ExcelJS from 'exceljs';
import type { ScheduleImportConflict, ScheduleImportIssue, ScheduleImportPreview, ScheduleImportRow } from '../../types';

type ImportUser = { id: number; name: string };
type ExistingSchedule = { date: string; user_id: number; is_manual?: boolean; user?: { id: number; name: string } };

export type CalendarScheduleImportDependencies = {
  getUserByName: (name: string) => ImportUser | undefined;
  getSchedulesByDates: (dates: string[]) => ExistingSchedule[];
};

const WEEKDAY_HEADERS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const EXCEL_EPOCH_BASE = new Date(1899, 11, 30); // Excel 日期序列号的基准日期

/**
 * 将 Excel 日期序列号转换为 YYYY-MM-DD 格式字符串
 */
function excelSerialToDate(serial: number): string | null {
  if (typeof serial !== 'number' || Number.isNaN(serial)) {
    return null;
  }

  const date = new Date(EXCEL_EPOCH_BASE.getTime() + serial * 86400000);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 规范化单元格值
 */
function normalizeCellValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value && 'text' in value) {
    return String((value as { text?: string }).text ?? '').trim() || null;
  }

  const str = String(value).trim();
  return str || null;
}

/**
 * 从单元格值获取日期字符串
 * 支持两种格式：
 * 1. Excel 序列号（数字）
 * 2. YYYY-MM-DD 或 MM/DD 格式字符串
 */
function extractDateFromCell(value: unknown): string | null {
  const normalized = normalizeCellValue(value);
  if (normalized === null) {
    return null;
  }

  // 数字类型：作为 Excel 序列号处理
  if (typeof normalized === 'number') {
    return excelSerialToDate(normalized);
  }

  // 字符串类型：尝试解析
  const str = normalized;

  // YYYY-MM-DD 格式
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return str;
  }

  // MM/DD 格式（假设为当前年份）
  const mdMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdMatch) {
    const month = mdMatch[1].padStart(2, '0');
    const day = mdMatch[2].padStart(2, '0');
    // 使用模板标题中的年份，如果无法确定则使用当前年份
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * 从标题行提取年月信息
 * 格式：xxxx年x月xxx值班表
 */
function extractYearMonthFromTitle(title: string): { year: number; month: number } | null {
  const match = title.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * 验证是否为月历式值班表模板
 */
function validateCalendarTemplate(sheet: ExcelJS.Worksheet): { valid: boolean; yearMonth?: { year: number; month: number }; error?: string } {
  // 检查第 2 行标题
  const titleCell = sheet.getCell(2, 1);
  const title = normalizeCellValue(titleCell.value);

  if (typeof title !== 'string' || !title.includes('值班表')) {
    return { valid: false, error: '第 2 行未找到标题（应包含"值班表"）' };
  }

  const yearMonth = extractYearMonthFromTitle(title);

  // 检查第 3 行星期头
  for (let col = 2; col <= 8; col++) {
    const cellValue = normalizeCellValue(sheet.getCell(3, col).value);
    if (typeof cellValue !== 'string' || cellValue !== WEEKDAY_HEADERS[col - 2]) {
      return { valid: false, error: '第 3 行星期头格式不正确' };
    }
  }

  // 检查第 4 行第一列是否为"日期"
  const firstLabel = normalizeCellValue(sheet.getCell(4, 1).value);
  if (typeof firstLabel !== 'string' || !firstLabel.includes('日期')) {
    return { valid: false, error: '第 4 行第一列应为"日期"标识' };
  }

  return { valid: true, yearMonth: yearMonth ?? undefined };
}

/**
 * 解析月历式值班表
 */
export async function previewCalendarScheduleImport(
  fileBuffer: Buffer,
  dependencies: Pick<CalendarScheduleImportDependencies, 'getUserByName' | 'getSchedulesByDates'>
): Promise<ScheduleImportPreview> {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      conflictRows: 0,
      cleanRows: 0,
      rows: [],
      issues: [{ row: 1, field: '文件', message: '无法解析导入文件，请确认使用模板生成的 .xlsx 文件' }],
      conflicts: [],
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      conflictRows: 0,
      cleanRows: 0,
      rows: [],
      issues: [{ row: 1, field: '文件', message: '未找到工作表' }],
      conflicts: [],
    };
  }

  const validation = validateCalendarTemplate(sheet);
  if (!validation.valid) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      conflictRows: 0,
      cleanRows: 0,
      rows: [],
      issues: [{ row: 1, field: '模板格式', message: validation.error ?? '模板格式不正确' }],
      conflicts: [],
    };
  }

  const rows: ScheduleImportRow[] = [];
  const issues: ScheduleImportIssue[] = [];
  const rowMetas: Array<{ rowNumber: number; date: string; userName: string }> = [];
  const seenDates = new Set<string>();
  let duplicateRows = 0;
  let totalRows = 0;

  // 从第 4 行开始解析，每次处理两行（日期行 + 值班员行）
  let currentRow = 4;

  while (currentRow <= sheet.rowCount) {
    const dateRowLabel = normalizeCellValue(sheet.getCell(currentRow, 1).value);

    // 检查是否为日期行
    if (typeof dateRowLabel !== 'string' || !dateRowLabel.includes('日期')) {
      break; // 不再是有效的数据行，结束解析
    }

    // 值班员行在下一行
    const dutyRowNumber = currentRow + 1;
    if (dutyRowNumber > sheet.rowCount) {
      break;
    }

    const dutyRowLabel = normalizeCellValue(sheet.getCell(dutyRowNumber, 1).value);
    if (typeof dutyRowLabel !== 'string' || !dutyRowLabel.includes('值班员')) {
      // 值班员行标识不正确，跳过这对行
      currentRow += 2;
      continue;
    }

    // 解析每一列（B 到 H，即 2 到 8）
    for (let col = 2; col <= 8; col++) {
      const dateValue = sheet.getCell(currentRow, col).value;
      const dutyName = normalizeCellValue(sheet.getCell(dutyRowNumber, col).value);

      // 跳过空单元格
      if (dateValue === null || dateValue === undefined || dateValue === '') {
        continue;
      }

      totalRows += 1;
      const rowNumber = currentRow; // 用日期行号标识

      const date = extractDateFromCell(dateValue);
      if (!date) {
        issues.push({
          row: rowNumber,
          field: '日期',
          message: `第 ${col - 1} 列日期格式无效`,
        });
        continue;
      }

      const userName = typeof dutyName === 'string' ? dutyName.trim() : '';
      if (!userName) {
        // 值班员为空，跳过（可能是待填写的模板）
        continue;
      }

      const user = dependencies.getUserByName(userName);
      if (!user) {
        issues.push({
          row: rowNumber,
          field: '值班人员姓名',
          message: `第 ${col - 1} 列：系统中不存在该值班人员 "${userName}"`,
        });
        continue;
      }

      if (seenDates.has(date)) {
        duplicateRows += 1;
        issues.push({
          row: rowNumber,
          field: '日期',
          message: `第 ${col - 1} 列：导入文件中存在重复日期 ${date}`,
        });
        continue;
      }

      seenDates.add(date);
      rows.push({
        date,
        userName,
        userId: user.id,
        isManual: true, // 导入的排班默认标记为手动调整
        notes: '',
      });
      rowMetas.push({ rowNumber, date, userName });
    }

    currentRow += 2; // 移动到下一对日期/值班员行
  }

  // 检查与现有排班的冲突
  const existingSchedules = dependencies.getSchedulesByDates(rows.map(row => row.date));
  const existingByDate = new Map(existingSchedules.map(schedule => [schedule.date, schedule]));
  const conflicts: ScheduleImportConflict[] = [];

  for (const meta of rowMetas) {
    const existing = existingByDate.get(meta.date);
    if (!existing) {
      continue;
    }

    conflicts.push({
      row: meta.rowNumber,
      date: meta.date,
      incomingUserName: meta.userName,
      existingUserName: existing.user?.name ?? '未知',
    });
  }

  return {
    totalRows,
    validRows: rows.length,
    invalidRows: issues.length,
    duplicateRows,
    conflictRows: conflicts.length,
    cleanRows: rows.length - conflicts.length,
    rows,
    issues,
    conflicts,
  };
}

/**
 * 导入月历式值班表数据
 */
export async function importCalendarScheduleRows(
  fileBuffer: Buffer,
  strategy: 'skip' | 'overwrite',
  dependencies: CalendarScheduleImportDependencies
): Promise<{ success: boolean; importedCount: number; skippedCount: number; overwrittenCount: number; preview: ScheduleImportPreview }> {
  const preview = await previewCalendarScheduleImport(fileBuffer, dependencies);

  if (preview.issues.length > 0) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      overwrittenCount: 0,
      preview,
    };
  }

  const conflictDates = new Set(preview.conflicts.map(conflict => conflict.date));
  let importedCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  for (const row of preview.rows) {
    if (conflictDates.has(row.date) && strategy === 'skip') {
      skippedCount += 1;
      continue;
    }

    dependencies.setSchedule(row.date, row.userId, row.isManual);
    importedCount += 1;

    if (conflictDates.has(row.date) && strategy === 'overwrite') {
      overwrittenCount += 1;
    }
  }

  return {
    success: true,
    importedCount,
    skippedCount,
    overwrittenCount,
    preview,
  };
}

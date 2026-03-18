import ExcelJS from 'exceljs';
import type { ScheduleImportConflict, ScheduleImportIssue, ScheduleImportPreview, ScheduleImportRow, ScheduleImportStrategy, ScheduleImportTemplateType } from '../../types';
import { parseCalendarScheduleImport } from './calendar-schedule-import.js';

type ImportUser = { id: number; name: string };
type ExistingSchedule = { date: string; user_id: number; is_manual?: boolean; user?: { id: number; name: string } };

export type ScheduleImportDependencies = {
  getUserByName: (name: string) => ImportUser | undefined;
  getSchedulesByDates: (dates: string[]) => ExistingSchedule[];
  setSchedule: (date: string, userId: number, isManual: boolean) => void;
};

export type ScheduleImportSuccessResult = {
  success: true;
  importedCount: number;
  skippedCount: number;
  overwrittenCount: number;
  conflictCount: number;
  markedOnly: boolean;
  preview: ScheduleImportPreview;
};

export type ScheduleImportFailureResult = {
  success: false;
  importedCount: number;
  skippedCount: number;
  overwrittenCount: number;
  conflictCount: number;
  markedOnly: boolean;
  preview: ScheduleImportPreview;
};

export type ScheduleImportResult = ScheduleImportSuccessResult | ScheduleImportFailureResult;

const SCHEDULE_TEMPLATE_HEADERS = [
  '日期（必填，YYYY-MM-DD）',
  '值班人员姓名（必填）',
  '是否手动调整（必填，是/否）',
  '备注（选填）',
] as const;

const VALID_MANUAL_VALUES = new Map<string, boolean>([
  ['是', true],
  ['否', false],
]);

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && value && 'text' in value) {
    return String((value as { text?: string }).text ?? '').trim();
  }

  return String(value).trim();
}

function isEmptyRow(values: string[]) {
  return values.every(value => value === '');
}

function validateHeaders(headers: string[]) {
  return SCHEDULE_TEMPLATE_HEADERS.every((header, index) => headers[index] === header);
}

function normalizeDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10) === value ? value : null;
}

async function parseImportRows(
  fileBuffer: Buffer,
  templateType: ScheduleImportTemplateType
): Promise<{
  totalRows: number;
  rows: Array<Pick<ScheduleImportRow, 'date' | 'userName' | 'isManual' | 'notes'> & { rowNumber: number }>;
  issues: ScheduleImportIssue[];
  duplicateRows: number;
}> {
  if (templateType === 'calendar') {
    const result = await parseCalendarScheduleImport(fileBuffer);
    return {
      totalRows: result.rows.length + result.issues.length,
      rows: result.rows,
      issues: result.issues,
      duplicateRows: result.issues.filter(issue => issue.message.includes('重复日期')).length,
    };
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return {
      totalRows: 0,
      rows: [],
      issues: [{ row: 1, field: '文件', message: '无法解析导入文件，请确认使用模板生成的 .xlsx 文件' }],
      duplicateRows: 0,
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      totalRows: 0,
      rows: [],
      issues: [{ row: 1, field: '文件', message: '未找到工作表' }],
      duplicateRows: 0,
    };
  }

  const headers = Array.from({ length: SCHEDULE_TEMPLATE_HEADERS.length }, (_, index) =>
    normalizeCellValue(sheet.getRow(1).getCell(index + 1).value)
  );

  if (!validateHeaders(headers)) {
    return {
      totalRows: 0,
      rows: [],
      issues: [{ row: 1, field: '表头', message: '模板表头不匹配，请先下载最新模板' }],
      duplicateRows: 0,
    };
  }

  const rows: Array<Pick<ScheduleImportRow, 'date' | 'userName' | 'isManual' | 'notes'> & { rowNumber: number }> = [];
  const issues: ScheduleImportIssue[] = [];
  const seenDates = new Set<string>();
  let duplicateRows = 0;
  let totalRows = 0;

  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const values = Array.from({ length: SCHEDULE_TEMPLATE_HEADERS.length }, (_, index) =>
      normalizeCellValue(sheet.getRow(rowNumber).getCell(index + 1).value)
    );

    if (isEmptyRow(values)) {
      continue;
    }

    totalRows += 1;

    const [rawDate, userName, isManualValue, notes] = values;
    const rowIssues: ScheduleImportIssue[] = [];
    const normalizedDate = rawDate ? normalizeDate(rawDate) : null;

    if (!rawDate) {
      rowIssues.push({ row: rowNumber, field: '日期', message: '日期不能为空' });
    } else if (!normalizedDate) {
      rowIssues.push({ row: rowNumber, field: '日期', message: '日期必须是 YYYY-MM-DD 格式' });
    }

    if (!userName) {
      rowIssues.push({ row: rowNumber, field: '值班人员姓名', message: '值班人员姓名不能为空' });
    }

    if (!isManualValue) {
      rowIssues.push({ row: rowNumber, field: '是否手动调整', message: '是否手动调整不能为空' });
    } else if (!VALID_MANUAL_VALUES.has(isManualValue)) {
      rowIssues.push({ row: rowNumber, field: '是否手动调整', message: '是否手动调整必须是 是 或 否' });
    }

    if (normalizedDate) {
      if (seenDates.has(normalizedDate)) {
        duplicateRows += 1;
        rowIssues.push({ row: rowNumber, field: '日期', message: '导入文件中存在重复日期' });
      } else {
        seenDates.add(normalizedDate);
      }
    }

    if (rowIssues.length > 0 || !normalizedDate) {
      issues.push(...rowIssues);
      continue;
    }

    rows.push({
      rowNumber,
      date: normalizedDate,
      userName,
      isManual: VALID_MANUAL_VALUES.get(isManualValue) ?? false,
      notes,
    });
  }

  return { totalRows, rows, issues, duplicateRows };
}

export async function previewScheduleImport(
  fileBuffer: Buffer,
  dependencies: Pick<ScheduleImportDependencies, 'getUserByName' | 'getSchedulesByDates'>,
  templateType: ScheduleImportTemplateType = 'standard'
): Promise<ScheduleImportPreview> {
  const parsed = await parseImportRows(fileBuffer, templateType);
  const rows: ScheduleImportRow[] = [];
  const issues: ScheduleImportIssue[] = [...parsed.issues];
  const rowMetas: Array<{ rowNumber: number; date: string; userName: string }> = [];

  for (const row of parsed.rows) {
    const user = row.userName ? dependencies.getUserByName(row.userName) : undefined;
    if (!user) {
      issues.push({ row: row.rowNumber, field: '值班人员姓名', message: '系统中不存在该值班人员' });
      continue;
    }

    rows.push({
      date: row.date,
      userName: row.userName,
      userId: user.id,
      isManual: row.isManual,
      notes: row.notes,
    });
    rowMetas.push({ rowNumber: row.rowNumber, date: row.date, userName: row.userName });
  }

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
    totalRows: parsed.totalRows,
    validRows: rows.length,
    invalidRows: issues.length,
    duplicateRows: parsed.duplicateRows,
    conflictRows: conflicts.length,
    cleanRows: rows.length - conflicts.length,
    rows,
    issues,
    conflicts,
  };
}

export async function importScheduleRows(
  fileBuffer: Buffer,
  strategy: ScheduleImportStrategy,
  dependencies: ScheduleImportDependencies,
  templateType: ScheduleImportTemplateType = 'standard'
): Promise<ScheduleImportResult> {
  const preview = await previewScheduleImport(fileBuffer, dependencies, templateType);

  if (preview.issues.length > 0) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      overwrittenCount: 0,
      conflictCount: preview.conflicts.length,
      markedOnly: false,
      preview,
    };
  }

  if (strategy === 'mark_conflicts') {
    return {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      overwrittenCount: 0,
      conflictCount: preview.conflicts.length,
      markedOnly: true,
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
    conflictCount: preview.conflicts.length,
    markedOnly: false,
    preview,
  };
}

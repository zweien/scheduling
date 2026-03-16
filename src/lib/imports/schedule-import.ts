import ExcelJS from 'exceljs';
import type { ScheduleImportConflict, ScheduleImportIssue, ScheduleImportPreview, ScheduleImportRow, ScheduleImportStrategy } from '../../types';
import { SCHEDULE_TEMPLATE_HEADERS } from './schedule-import-template.ts';

type ImportUser = { id: number; name: string };
type ExistingSchedule = { date: string; user_id: number; is_manual?: boolean; user?: { id: number; name: string } };

export type ScheduleImportDependencies = {
  getUserByName: (name: string) => ImportUser | undefined;
  getSchedulesByDates: (dates: string[]) => ExistingSchedule[];
  setSchedule: (date: string, userId: number, isManual: boolean) => void;
};

export type ScheduleImportResult = {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  overwrittenCount: number;
  conflictCount: number;
  markedOnly: boolean;
  preview: ScheduleImportPreview;
};

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

export async function previewScheduleImport(
  fileBuffer: Buffer,
  dependencies: Pick<ScheduleImportDependencies, 'getUserByName' | 'getSchedulesByDates'>
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

  const headers = Array.from({ length: SCHEDULE_TEMPLATE_HEADERS.length }, (_, index) =>
    normalizeCellValue(sheet.getRow(1).getCell(index + 1).value)
  );

  if (!validateHeaders(headers)) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      conflictRows: 0,
      cleanRows: 0,
      rows: [],
      issues: [{ row: 1, field: '表头', message: '模板表头不匹配，请先下载最新模板' }],
      conflicts: [],
    };
  }

  const rows: ScheduleImportRow[] = [];
  const issues: ScheduleImportIssue[] = [];
  const rowMetas: Array<{ rowNumber: number; date: string; userName: string }> = [];
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

    const user = userName ? dependencies.getUserByName(userName) : undefined;
    if (userName && !user) {
      rowIssues.push({ row: rowNumber, field: '值班人员姓名', message: '系统中不存在该值班人员' });
    }

    if (rowIssues.length > 0 || !normalizedDate || !user) {
      issues.push(...rowIssues);
      continue;
    }

    rows.push({
      date: normalizedDate,
      userName,
      userId: user.id,
      isManual: VALID_MANUAL_VALUES.get(isManualValue) ?? false,
      notes,
    });
    rowMetas.push({ rowNumber, date: normalizedDate, userName });
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

export async function importScheduleRows(
  fileBuffer: Buffer,
  strategy: ScheduleImportStrategy,
  dependencies: ScheduleImportDependencies
): Promise<ScheduleImportResult> {
  const preview = await previewScheduleImport(fileBuffer, dependencies);

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

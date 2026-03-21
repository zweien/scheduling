import ExcelJS from 'exceljs';
import type { DutyUserImportIssue, DutyUserImportPreview, DutyUserImportRow, UserCategory, UserOrganization } from '@/types';
import { TEMPLATE_HEADERS } from './duty-users-template';
import { isValidConfigValue, getConfigOptions } from '../config-options';

const REQUIRED_HEADER_COUNT = TEMPLATE_HEADERS.length;
const VALID_ACTIVE_VALUES = new Map<string, boolean>([
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
  if (headers.length < REQUIRED_HEADER_COUNT) {
    return false;
  }

  return TEMPLATE_HEADERS.every((header, index) => headers[index] === header);
}

export async function previewDutyUsersImport(fileBuffer: Buffer): Promise<DutyUserImportPreview> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return {
      totalRows: 0,
      validRows: 0,
      rows: [],
      issues: [{ row: 1, field: '文件', message: '无法解析导入文件，请确认使用模板生成的 .xlsx 文件' }],
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      totalRows: 0,
      validRows: 0,
      rows: [],
      issues: [{ row: 1, field: '文件', message: '未找到工作表' }],
    };
  }

  const headerRow = sheet.getRow(1);
  const headers = Array.from({ length: REQUIRED_HEADER_COUNT }, (_, index) => normalizeCellValue(headerRow.getCell(index + 1).value));
  if (!validateHeaders(headers)) {
    return {
      totalRows: 0,
      validRows: 0,
      rows: [],
      issues: [{ row: 1, field: '表头', message: '模板表头不匹配，请先下载最新模板' }],
    };
  }

  const rows: DutyUserImportRow[] = [];
  const issues: DutyUserImportIssue[] = [];
  const seenNames = new Set<string>();
  let totalRows = 0;

  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = Array.from({ length: REQUIRED_HEADER_COUNT }, (_, index) => normalizeCellValue(row.getCell(index + 1).value));

    if (isEmptyRow(values)) {
      continue;
    }

    totalRows += 1;

    const [name, organization, category, isActiveValue, notes] = values;
    const rowIssues: DutyUserImportIssue[] = [];

    if (!name) {
      rowIssues.push({ row: rowNumber, field: '姓名', message: '姓名不能为空' });
    }

    if (!organization) {
      rowIssues.push({ row: rowNumber, field: '所属单位', message: '所属单位不能为空' });
    } else if (!isValidConfigValue('organization', organization)) {
      const validLabels = getConfigOptions('organization').map(o => o.label).join('、');
      rowIssues.push({ row: rowNumber, field: '所属单位', message: `所属单位必须是 ${validLabels} 之一` });
    }

    if (!category) {
      rowIssues.push({ row: rowNumber, field: '人员类别', message: '人员类别不能为空' });
    } else if (!isValidConfigValue('category', category)) {
      const validLabels = getConfigOptions('category').map(c => c.label).join('、');
      rowIssues.push({ row: rowNumber, field: '人员类别', message: `人员类别必须是 ${validLabels} 之一` });
    }

    if (!isActiveValue) {
      rowIssues.push({ row: rowNumber, field: '是否参与值班', message: '是否参与值班不能为空' });
    } else if (!VALID_ACTIVE_VALUES.has(isActiveValue)) {
      rowIssues.push({ row: rowNumber, field: '是否参与值班', message: '是否参与值班必须是 是 或 否' });
    }

    if (name) {
      if (seenNames.has(name)) {
        rowIssues.push({ row: rowNumber, field: '姓名', message: '导入文件中存在重复姓名' });
      } else {
        seenNames.add(name);
      }
    }

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      continue;
    }

    rows.push({
      name,
      organization: organization as UserOrganization,
      category: category as UserCategory,
      isActive: VALID_ACTIVE_VALUES.get(isActiveValue) ?? false,
      notes,
    });
  }

  return {
    totalRows,
    validRows: rows.length,
    rows,
    issues,
  };
}

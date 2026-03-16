import ExcelJS from 'exceljs';

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

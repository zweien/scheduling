import ExcelJS from 'exceljs';

const TEMPLATE_HEADERS = [
  '姓名（必填）',
  '所属单位（必填，W/X/Z）',
  '人员类别（必填，J/W）',
  '是否参与值班（必填，是/否）',
  '备注（选填）',
] as const;

export async function buildDutyUsersTemplateWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'scheduling';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('值班人员模板');
  sheet.addRow(TEMPLATE_HEADERS);
  sheet.addRow(['张三', 'W', 'J', '是', '示例备注']);

  sheet.columns = [
    { width: 22 },
    { width: 24 },
    { width: 22 },
    { width: 24 },
    { width: 36 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
  });

  sheet.getRow(2).eachCell(cell => {
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export { TEMPLATE_HEADERS };

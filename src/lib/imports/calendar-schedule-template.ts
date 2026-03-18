import ExcelJS from 'exceljs';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  getDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

const WEEKDAY_HEADERS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const EXCEL_EPOCH_BASE = new Date(1899, 11, 30);

/**
 * 将日期转换为 Excel 序列号
 */
function dateToExcelSerial(date: Date): number {
  const diff = date.getTime() - EXCEL_EPOCH_BASE.getTime();
  return Math.round(diff / 86400000);
}

/**
 * 生成月历式值班表导入模板
 * @param year 年份
 * @param month 月份 (1-12)
 */
export async function buildCalendarScheduleTemplateWorkbook(year: number, month: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'scheduling';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${year}年${month}月`);

  // 计算日历范围
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 第 1 行：空行
  sheet.getRow(1).height = 10;

  // 第 2 行：标题
  sheet.mergeCells('A2:H2');
  const titleCell = sheet.getCell('A2');
  titleCell.value = `${year}年${month}月值班表`;
  titleCell.font = { name: '微软雅黑', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 30;

  // 第 3 行：星期头（从 B 列开始）
  sheet.getCell(3, 1).value = '';
  WEEKDAY_HEADERS.forEach((label, index) => {
    const cell = sheet.getCell(3, index + 2);
    cell.value = label;
    cell.font = { name: '微软雅黑', size: 11, bold: true };
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
  sheet.getRow(3).height = 24;

  // 按周分组
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach(day => {
    currentWeek.push(day);
    if (getDay(day) === 0 || day === days[days.length - 1]) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // 填充每周数据（每周 2 行：日期行 + 值班员行）
  let rowNumber = 4;
  weeks.forEach(week => {
    // 日期行
    const dateRow = sheet.getRow(rowNumber);
    sheet.getCell(rowNumber, 1).value = '日 期';
    sheet.getCell(rowNumber, 1).font = { name: '微软雅黑', size: 10, bold: true };
    sheet.getCell(rowNumber, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell(rowNumber, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
    sheet.getCell(rowNumber, 1).border = {
      top: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      left: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      right: { style: 'thin', color: { argb: 'FFD0D7E2' } },
    };

    week.forEach((day, colIndex) => {
      const cell = sheet.getCell(rowNumber, colIndex + 2);
      const isCurrentMonth = day.getMonth() === month - 1;

      if (isCurrentMonth) {
        // 使用 Excel 序列号格式
        cell.value = dateToExcelSerial(day);
        cell.numFmt = 'MM/DD';
        cell.font = { name: '微软雅黑', size: 10 };
      } else {
        cell.value = '';
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        left: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        right: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      };
      if (!isCurrentMonth) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      }
    });
    dateRow.height = 22;

    // 值班员行
    rowNumber += 1;
    const dutyRow = sheet.getRow(rowNumber);
    sheet.getCell(rowNumber, 1).value = '值班员';
    sheet.getCell(rowNumber, 1).font = { name: '微软雅黑', size: 10, bold: true };
    sheet.getCell(rowNumber, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell(rowNumber, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
    sheet.getCell(rowNumber, 1).border = {
      top: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      left: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      right: { style: 'thin', color: { argb: 'FFD0D7E2' } },
    };

    week.forEach((day, colIndex) => {
      const cell = sheet.getCell(rowNumber, colIndex + 2);
      const isCurrentMonth = day.getMonth() === month - 1;

      cell.value = isCurrentMonth ? '' : '';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        left: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } },
        right: { style: 'thin', color: { argb: 'FFD0D7E2' } },
      };
      if (!isCurrentMonth) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      }
    });
    dutyRow.height = 22;

    rowNumber += 1;
  });

  // 设置列宽
  sheet.getColumn(1).width = 10;
  for (let col = 2; col <= 8; col++) {
    sheet.getColumn(col).width = 12;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 生成当前月的月历式值班表模板
 */
export async function buildCurrentMonthCalendarTemplate(): Promise<Buffer> {
  const now = new Date();
  return buildCalendarScheduleTemplateWorkbook(now.getFullYear(), now.getMonth() + 1);
}

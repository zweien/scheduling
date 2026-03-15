import path from 'path';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { expect, test } from 'playwright/test';
import { buildCalendarWorkbook } from '../src/lib/export/calendar-xlsx';
import { getSchedulesByDateRange } from '../src/lib/schedules';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedSchedules() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();

  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (1, ?, 1, 1)').run('张三');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (2, ?, 2, 1)').run('李四');
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-03-16', 1);
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run('2026-04-02', 2);
}

async function login(page: import('playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  seedSchedules();
});

test('月历工作簿按月份创建 sheet 并写入排班内容', async () => {
  const schedules = getSchedulesByDateRange('2026-03-01', '2026-04-30');
  const buffer = await buildCalendarWorkbook('2026-03-01', '2026-04-30', schedules);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['2026-03', '2026-04']);

  const march = workbook.getWorksheet('2026-03');
  const april = workbook.getWorksheet('2026-04');

  expect(march?.getCell('A1').value).toBe('2026年3月值班日历');
  expect(april?.getCell('A1').value).toBe('2026年4月值班日历');

  const marchValues = march?.getSheetValues().flatMap(value => Array.isArray(value) ? value : [value]).join(' ');
  const aprilValues = april?.getSheetValues().flatMap(value => Array.isArray(value) ? value : [value]).join(' ');

  expect(marchValues).toContain('3/16');
  expect(marchValues).toContain('张三');
  expect(aprilValues).toContain('4/2');
  expect(aprilValues).toContain('李四');
  expect(aprilValues).toContain('手动调整');
});

test('导出弹窗展示 XLSX 导出入口', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '导出' }).click();

  await expect(page.getByText('导出排班表')).toBeVisible();
  await expect(page.getByRole('button', { name: '导出 XLSX' })).toBeVisible();
});

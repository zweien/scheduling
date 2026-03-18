import path from 'path';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some(column => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function ensureUsersSchema() {
  addColumnIfMissing('users', 'is_active', 'INTEGER DEFAULT 1');
  addColumnIfMissing('users', 'organization', "TEXT NOT NULL DEFAULT 'W'");
  addColumnIfMissing('users', 'category', "TEXT NOT NULL DEFAULT 'W'");
  addColumnIfMissing('users', 'notes', "TEXT DEFAULT ''");
}

function seedSchedules() {
  ensureUsersSchema();
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('UPDATE accounts SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES
      (1, '张三', 1, 1, 'W', 'J', ''),
      (2, '李四', 2, 1, 'X', 'W', '')
  `).run();
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

async function createCalendarWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('月历值班表');

  sheet.addRow([]);
  sheet.addRow(['2026年3月值班表']);
  sheet.addRow(['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']);
  sheet.addRow(['日期', '', '', '', '', '', 46082, 46083]);
  sheet.addRow(['值班员', '', '', '', '', '', '张三', '李四']);
  sheet.addRow(['日期', 46084, 46085, '', '', '', '', '']);
  sheet.addRow(['值班员', '张三', '李四', '', '', '', '', '']);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function createCalendarWorkbookBufferWithBlankCells() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('月历值班表');

  sheet.addRow([]);
  sheet.addRow(['2026年3月值班表']);
  sheet.addRow(['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']);
  sheet.addRow(['日期', '', '', '', '', '', 46082, 46083]);
  sheet.addRow(['值班员', '', '', '', '', '', '', '李四']);
  sheet.addRow(['日期', 46084, 46085, '', '', '', '', '']);
  sheet.addRow(['值班员', '张三', '', '', '', '', '', '']);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

test.beforeEach(() => {
  seedSchedules();
});

test('导入排班对话框支持切换标准模板和月历模板', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '导入排班' }).click();

  await expect(page.getByLabel('标准模板')).toBeVisible();
  await expect(page.getByLabel('月历模板')).toBeVisible();

  await page.getByLabel('月历模板').check();
  await expect(page.getByText('每周两行：上行日期，下行值班员')).toBeVisible();
  await expect(page.getByLabel('模板月份')).toHaveValue(/\d{4}-\d{2}/);
});

test('月历模板下载支持选择真实月份', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '导入排班' }).click();
  await page.getByLabel('月历模板').check();
  await page.getByLabel('模板月份').fill('2026-04');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载模板' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('排班月历模板-2026-04.xlsx');

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(downloadPath!);
  const sheet = workbook.worksheets[0];
  expect(sheet.getCell('A2').value).toBe('2026年04月XXX值班表');
});

test('月历模板可完成预检并成功导入', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '导入排班' }).click();
  await page.getByLabel('月历模板').check();

  const buffer = await createCalendarWorkbookBuffer();
  await page.locator('#schedule-import-file').setInputFiles({
    name: 'calendar-import.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  await page.getByRole('button', { name: '校验文件' }).click();
  await expect(page.getByText('文件校验通过，可导入 4 条排班')).toBeVisible();

  await page.getByRole('button', { name: '开始导入' }).click();
  await expect(page.getByText('导入完成：成功 4 条，跳过 0 条，覆盖 0 条，冲突 0 条')).toBeVisible();

  const rows = db.prepare('SELECT date, user_id, is_manual FROM schedules ORDER BY date').all() as Array<{
    date: string;
    user_id: number;
    is_manual: number;
  }>;

  expect(rows).toEqual([
    { date: '2026-03-01', user_id: 1, is_manual: 1 },
    { date: '2026-03-02', user_id: 2, is_manual: 1 },
    { date: '2026-03-03', user_id: 1, is_manual: 1 },
    { date: '2026-03-04', user_id: 2, is_manual: 1 },
  ]);
});

test('月历模板中的空白值班员会被忽略，不覆盖现有排班', async ({ page }) => {
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, ?)').run('2026-03-01', 1, 0);
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, ?)').run('2026-03-03', 2, 0);

  await login(page);
  await page.getByRole('button', { name: '导入排班' }).click();
  await page.getByLabel('月历模板').check();

  const buffer = await createCalendarWorkbookBufferWithBlankCells();
  await page.locator('#schedule-import-file').setInputFiles({
    name: 'calendar-import-with-blanks.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  await page.getByRole('button', { name: '校验文件' }).click();
  await expect(page.getByText('检测到 1 条系统内冲突记录')).toBeVisible();
  await page.getByRole('radio', { name: '跳过已有日期' }).check();
  await page.getByRole('button', { name: '开始导入' }).click();
  await expect(page.getByText('导入完成：成功 1 条，跳过 1 条，覆盖 0 条，冲突 1 条')).toBeVisible();

  const rows = db.prepare('SELECT date, user_id, is_manual FROM schedules ORDER BY date').all() as Array<{
    date: string;
    user_id: number;
    is_manual: number;
  }>;

  expect(rows).toEqual([
    { date: '2026-03-01', user_id: 1, is_manual: 0 },
    { date: '2026-03-02', user_id: 2, is_manual: 1 },
    { date: '2026-03-03', user_id: 2, is_manual: 0 },
  ]);
});

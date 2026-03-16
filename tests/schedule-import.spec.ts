import path from 'path';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedSchedules() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('UPDATE accounts SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES
      (1, '张三', 1, 1, 'W', 'J', ''),
      (2, '李四', 2, 1, 'X', 'W', ''),
      (3, '王五', 3, 1, 'Z', 'J', '')
  `).run();

  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, ?)').run('2026-03-21', 1, 0);
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

async function createWorkbookBuffer(rows: Array<[string, string, string, string]>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('排班导入模板');
  sheet.addRow(['日期（必填，YYYY-MM-DD）', '值班人员姓名（必填）', '是否手动调整（必填，是/否）', '备注（选填）']);
  sheet.addRow(['2026-03-20', '张三', '否', '示例备注']);
  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

test.beforeEach(() => {
  seedSchedules();
});

test('排班页支持下载模板和预检导入文件', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('button', { name: '导入排班' })).toBeVisible();
  await page.getByRole('button', { name: '导入排班' }).click();
  await expect(page.getByRole('heading', { name: '导入排班' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载模板' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('排班导入模板.xlsx');

  await page.locator('#schedule-import-file').setInputFiles({
    name: 'invalid.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('invalid-file'),
  });
  await page.getByRole('button', { name: '校验文件' }).click();
  await expect(page.getByText('导入文件存在错误，请先修正')).toBeVisible();
  await expect(page.getByText('无法解析导入文件，请确认使用模板生成的 .xlsx 文件')).toBeVisible();
});

test('skip 策略会跳过冲突日期，只导入无冲突记录', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '导入排班' }).click();

  const buffer = await createWorkbookBuffer([
    ['2026-03-21', '李四', '是', '冲突记录'],
    ['2026-03-22', '王五', '否', '正常导入'],
  ]);

  await page.locator('#schedule-import-file').setInputFiles({
    name: 'schedule-import.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });
  await page.getByRole('button', { name: '校验文件' }).click();
  await expect(page.getByText('检测到 1 条系统内冲突记录')).toBeVisible();
  await page.getByRole('radio', { name: '跳过已有日期' }).check();
  await page.getByRole('button', { name: '开始导入' }).click();

  await expect(page.getByText('导入完成：成功 1 条，跳过 1 条，覆盖 0 条，冲突 1 条')).toBeVisible();

  const existing = db.prepare('SELECT date, user_id, is_manual FROM schedules WHERE date = ?').get('2026-03-21') as { date: string; user_id: number; is_manual: number };
  const imported = db.prepare('SELECT date, user_id, is_manual FROM schedules WHERE date = ?').get('2026-03-22') as { date: string; user_id: number; is_manual: number };
  expect(existing.user_id).toBe(1);
  expect(imported.user_id).toBe(3);
});

test('overwrite 策略会覆盖已有排班，mark_conflicts 不会写入数据库', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '导入排班' }).click();

  const overwriteBuffer = await createWorkbookBuffer([
    ['2026-03-21', '李四', '是', '覆盖记录'],
  ]);

  await page.locator('#schedule-import-file').setInputFiles({
    name: 'overwrite.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: overwriteBuffer,
  });
  await page.getByRole('button', { name: '校验文件' }).click();
  await page.getByRole('radio', { name: '覆盖已有日期' }).check();
  await page.getByRole('button', { name: '开始导入' }).click();
  await expect(page.getByText('导入完成：成功 1 条，跳过 0 条，覆盖 1 条，冲突 1 条')).toBeVisible();

  let updated = db.prepare('SELECT user_id, is_manual FROM schedules WHERE date = ?').get('2026-03-21') as { user_id: number; is_manual: number };
  expect(updated.user_id).toBe(2);
  expect(updated.is_manual).toBe(1);

  await page.getByRole('button', { name: '关闭' }).click();
  await page.getByRole('button', { name: '导入排班' }).click();

  const markOnlyBuffer = await createWorkbookBuffer([
    ['2026-03-21', '张三', '否', '只标记冲突'],
    ['2026-03-23', '王五', '否', '不应导入'],
  ]);

  await page.locator('#schedule-import-file').setInputFiles({
    name: 'mark-conflicts.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: markOnlyBuffer,
  });
  await page.getByRole('button', { name: '校验文件' }).click();
  await page.getByRole('radio', { name: '仅标记冲突，不执行导入' }).check();
  await page.getByRole('button', { name: '开始导入' }).click();
  await expect(page.getByText('已生成冲突清单，本次未执行导入')).toBeVisible();

  updated = db.prepare('SELECT user_id, is_manual FROM schedules WHERE date = ?').get('2026-03-21') as { user_id: number; is_manual: number };
  const absent = db.prepare('SELECT user_id FROM schedules WHERE date = ?').get('2026-03-23') as { user_id: number } | undefined;
  expect(updated.user_id).toBe(2);
  expect(absent).toBeUndefined();
});

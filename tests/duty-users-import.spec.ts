import path from 'path';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedUsers() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(1, '张三', 1, 1, 'W', 'J', '旧备注');
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

async function createWorkbookBuffer(rows: Array<[string, string, string, string, string]>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('值班人员模板');
  sheet.addRow([
    '姓名（必填）',
    '所属单位（必填，W/X/Z）',
    '人员类别（必填，J/W）',
    '是否参与值班（必填，是/否）',
    '备注（选填）',
  ]);
  sheet.addRow(['张三', 'W', 'J', '是', '示例备注']);
  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

test.beforeEach(() => {
  seedUsers();
});

test('值班人员页支持模板下载、预检和批量导入', async ({ page }) => {
  await login(page);
  await page.goto(`${baseUrl}/dashboard/users`);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载模板' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('值班人员导入模板.xlsx');

  await page.locator('#duty-user-import-file').setInputFiles({
    name: 'invalid.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('invalid-file'),
  });
  await page.getByRole('button', { name: '校验文件' }).click();
  await expect(page.getByText('导入文件存在错误，请先修正')).toBeVisible();
  await expect(page.getByText('无法解析导入文件，请确认使用模板生成的 .xlsx 文件')).toBeVisible();

  const validBuffer = await createWorkbookBuffer([
    ['张三', 'X', 'W', '否', '已更新'],
    ['李四', 'Z', 'J', '是', '新导入'],
  ]);

  await page.locator('#duty-user-import-file').setInputFiles({
    name: 'duty-users.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: validBuffer,
  });
  await page.getByRole('button', { name: '校验文件' }).click();
  await expect(page.getByText('文件校验通过，可以开始导入')).toBeVisible();

  await page.getByRole('button', { name: '开始导入' }).click();
  await expect(page.getByText('导入完成：新增 1 人，更新 1 人')).toBeVisible();

  await expect(page.getByText('李四')).toBeVisible();
  const zhangCard = page.locator('div.rounded-2xl.border.border-border.bg-card.p-4').filter({ hasText: '张三' }).first();
  await expect(zhangCard.getByText('X')).toBeVisible();
  await expect(zhangCard.getByText('W')).toBeVisible();
  await expect(zhangCard.getByText('已停用')).toBeVisible();
  await expect(zhangCard.getByText('已更新')).toBeVisible();
});

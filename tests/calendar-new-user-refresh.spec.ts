import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedCalendarData() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();

  db.prepare(
    "INSERT INTO users (id, name, sort_order, is_active, organization, category, notes) VALUES (1, ?, 1, 1, 'W', 'W', '')"
  ).run('张三');
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run('2026-03-16', 1);
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  seedCalendarData();
});

test('新增人员后月历弹窗立即显示新人员', async ({ page }) => {
  await login(page);

  const newUserName = `王五${Date.now()}`;
  await page.goto(`${baseUrl}/dashboard/users`);
  await page.getByLabel('姓名').fill(newUserName);
  await page.getByLabel('所属单位').last().selectOption('X');
  await page.getByLabel('人员类别').last().selectOption('J');
  await page.getByLabel('备注').fill('新加入');
  await page.getByRole('button', { name: '新增人员' }).click();
  await expect(page.getByText(newUserName)).toBeVisible();

  await page.goto(`${baseUrl}/dashboard`);
  await page.getByText('张', { exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: newUserName })).toBeVisible();
});

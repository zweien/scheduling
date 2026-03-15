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

  db.prepare("INSERT INTO users (id, name, sort_order, is_active, organization, category, notes) VALUES (1, '张三', 1, 1, 'W', 'W', '')").run();
  db.prepare("INSERT INTO users (id, name, sort_order, is_active, organization, category, notes) VALUES (2, '李四', 2, 1, 'X', 'J', '')").run();
  db.prepare("INSERT INTO users (id, name, sort_order, is_active, organization, category, notes) VALUES (3, '王五', 3, 1, 'Z', 'W', '')").run();
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

test('月历选人弹窗支持按姓名筛选', async ({ page }) => {
  await login(page);

  await page.getByText('张', { exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const searchInput = page.getByLabel('搜索姓名');
  await searchInput.fill('李');
  await expect(page.getByRole('button', { name: '李四' })).toBeVisible();
  await expect(page.getByRole('button', { name: '张三' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '王五' })).toHaveCount(0);

  await searchInput.fill('赵');
  await expect(page.getByText('没有匹配的值班人员')).toBeVisible();
});

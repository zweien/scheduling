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

test('月历视图可通过移动模式把排班移动到空日期', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.getByText('张', { exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '移动到其他日期' }).click();

  await expect(page.getByText(/正在移动 2026-03-16 的排班/)).toBeVisible();
  await page.locator('div').filter({ hasText: /^17$/ }).first().click();

  await expect(page.getByText(/正在移动 2026-03-16 的排班/)).toHaveCount(0);
  await expect(page.getByText('排班已移动')).toBeVisible();
  await expect(page.locator('[data-calendar-date="2026-03-17"]')).toContainText('张');
  await expect(page.locator('[data-calendar-date="2026-03-16"]')).not.toContainText('张');
});

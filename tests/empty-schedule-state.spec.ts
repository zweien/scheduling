import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedEmptySchedules() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('UPDATE accounts SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES
      (1, '张三', 1, 1, 'W', 'W', ''),
      (2, '李四', 2, 1, 'W', 'W', '')
  `).run();
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  seedEmptySchedules();
});

test('月历和列表视图在无排班时显示统一空状态引导', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await expect(page.getByText('当前月份还没有排班')).toBeVisible();
  await expect(page.getByText('可以先生成排班，也可以导入已有值班表')).toBeVisible();
  await expect(page.getByRole('button', { name: '去生成排班' })).toBeVisible();

  await page.getByRole('button', { name: '切换到列表视图' }).click();

  await expect(page.getByText('当前月份还没有排班')).toBeVisible();
  await expect(page.getByText('可以先生成排班，也可以导入已有值班表')).toBeVisible();
  await expect(page.getByRole('button', { name: '去生成排班' })).toBeVisible();
});

test('空状态点击去生成排班后聚焦现有生成入口', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '去生成排班' }).click();

  await expect(page.locator('#startDate')).toBeFocused();
});

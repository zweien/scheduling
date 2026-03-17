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

  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (1, ?, 1, 1)').run('张三');
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

test('月历视图中可将排班从有人的日期拖到空日期', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('heading', { name: '值班日历' })).toBeVisible();

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();
  const targetCell = page.locator('[data-calendar-date="2026-03-17"]').first();

  await sourceCell.dragTo(targetCell);
  await page.getByLabel('调整理由').fill('临时移动到空白日期值班说明');
  await page.getByRole('button', { name: '确认调整' }).click();

  await expect
    .poll(() => db.prepare('SELECT date FROM schedules WHERE user_id = 1').get()?.date)
    .toBe('2026-03-17');
});

test('拖到非日历区域结束后应清理拖动态', async ({ page }) => {
  await login(page);

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();

  await sourceCell.dispatchEvent('dragstart', {
    dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
  });
  await expect(sourceCell).toHaveClass(/opacity-40/);

  await sourceCell.dispatchEvent('dragend');
  await expect(sourceCell).not.toHaveClass(/opacity-40/);
});

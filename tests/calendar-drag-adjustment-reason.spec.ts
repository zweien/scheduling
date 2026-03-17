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

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active)
    VALUES
      (1, '张三', 1, 1),
      (2, '李四', 2, 1)
  `).run();

  db.prepare(`
    INSERT INTO schedules (date, user_id, is_manual)
    VALUES (?, ?, ?)
  `).run('2026-03-16', 1, 1);
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

test('拖拽到目标日期后弹出理由对话框', async ({ page }) => {
  await login(page);

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();
  const targetCell = page.locator('[data-calendar-date="2026-03-17"]').first();

  await sourceCell.dragTo(targetCell);

  await expect(page.getByRole('heading', { name: '确认移动排班' })).toBeVisible();
  await expect(page.getByText('2026-03-16')).toBeVisible();
  await expect(page.getByText('2026-03-17')).toBeVisible();
});

test('不填理由不能确认', async ({ page }) => {
  await login(page);

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();
  const targetCell = page.locator('[data-calendar-date="2026-03-17"]').first();

  await sourceCell.dragTo(targetCell);
  await page.getByRole('button', { name: '确认调整' }).click();

  await expect(page.getByText('请填写调整理由')).toBeVisible();
  await expect
    .poll(() => db.prepare('SELECT date FROM schedules WHERE user_id = 1').get()?.date)
    .toBe('2026-03-16');
});

test('取消后不落库', async ({ page }) => {
  await login(page);

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();
  const targetCell = page.locator('[data-calendar-date="2026-03-17"]').first();

  await sourceCell.dragTo(targetCell);
  await page.getByRole('button', { name: '取消' }).click();

  await expect(page.getByRole('heading', { name: '确认移动排班' })).toHaveCount(0);
  await expect
    .poll(() => db.prepare('SELECT date FROM schedules WHERE user_id = 1').get()?.date)
    .toBe('2026-03-16');
});

test('填写理由确认交换后显示原始与当前值班人员', async ({ page }) => {
  db.prepare(`
    INSERT INTO schedules (date, user_id, is_manual)
    VALUES (?, ?, ?)
  `).run('2026-03-17', 2, 1);

  await login(page);

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();
  const targetCell = page.locator('[data-calendar-date="2026-03-17"][draggable="true"]').first();

  await sourceCell.dragTo(targetCell);
  await page.getByLabel('调整理由').fill('临时互换当日值班安排说明');
  await page.getByRole('button', { name: '确认调整' }).click();

  await expect
    .poll(() => db.prepare('SELECT user_id FROM schedules WHERE date = ?').get('2026-03-16')?.user_id)
    .toBe(2);
  await expect(page.locator('[data-calendar-date="2026-03-16"]')).toContainText('原：张三');
  await expect(page.locator('[data-calendar-date="2026-03-16"]')).toContainText('现：李四');
});

test('目标日期和值班人员相同时不弹出交换确认框', async ({ page }) => {
  db.prepare(`
    INSERT INTO schedules (date, user_id, is_manual)
    VALUES (?, ?, ?)
  `).run('2026-03-17', 1, 1);

  await login(page);

  const sourceCell = page.locator('[data-calendar-date="2026-03-16"][draggable="true"]').first();
  const targetCell = page.locator('[data-calendar-date="2026-03-17"][draggable="true"]').first();

  await sourceCell.dragTo(targetCell);

  await expect(page.getByRole('heading', { name: '确认交换排班' })).toHaveCount(0);
  await expect
    .poll(() => db.prepare('SELECT user_id FROM schedules WHERE date = ?').get('2026-03-16')?.user_id)
    .toBe(1);
  await expect
    .poll(() => db.prepare('SELECT user_id FROM schedules WHERE date = ?').get('2026-03-17')?.user_id)
    .toBe(1);
});

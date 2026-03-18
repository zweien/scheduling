import path from 'path';
import Database from 'better-sqlite3';
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

function ensureSchedulesSchema() {
  addColumnIfMissing('schedules', 'original_user_id', 'INTEGER');
  addColumnIfMissing('schedules', 'adjust_reason', 'TEXT');
}

function seedCalendarData() {
  ensureUsersSchema();
  ensureSchedulesSchema();
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
  await expect(page.locator('button[title="切换为姓名"]')).toBeVisible();
  await page.getByRole('button', { name: '移动到其他日期' }).click();

  await expect(page.getByText(/正在移动 2026-03-16 的排班/)).toBeVisible();
  await page.locator('div').filter({ hasText: /^17$/ }).first().click();

  await expect(page.getByText(/正在移动 2026-03-16 的排班/)).toHaveCount(0);
  await expect(page.locator('[data-calendar-date="2026-03-17"]')).toContainText('张');
  await expect(page.locator('[data-calendar-date="2026-03-16"]')).not.toContainText('张');
});

test('移动端姓名模式下换班日期使用紧凑文本布局', async ({ page }) => {
  db.prepare(`
    UPDATE schedules
    SET user_id = ?, original_user_id = ?, adjust_reason = ?, is_manual = 1
    WHERE date = ?
  `).run(2, 1, '临时换班', '2026-03-16');

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const adjustedCell = page.locator('[data-calendar-date="2026-03-16"]');

  await page.getByRole('button', { name: '切换为姓名' }).click();
  await expect(adjustedCell).toContainText('原：');
  await expect(adjustedCell).toContainText('现：');
  await expect(adjustedCell.locator('[data-adjusted-display="name"]')).toBeVisible();
});

test('移动端姓名模式下可以看到完整姓名', async ({ page }) => {
  db.prepare('UPDATE users SET name = ? WHERE id = 1').run('欧阳测试甲');
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run('2026-03-17', 1);

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.getByRole('button', { name: '切换为姓名' }).click();

  await expect(page.locator('[data-calendar-date="2026-03-16"]')).toContainText('欧阳测试甲');
  await expect(page.locator('[data-calendar-date="2026-03-17"]')).toContainText('欧阳测试甲');
});

test('桌面端姓名模式下可以看到完整姓名', async ({ page }) => {
  db.prepare('UPDATE users SET name = ? WHERE id = 1').run('欧阳测试甲');
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run('2026-03-17', 1);

  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await expect(page.locator('[data-calendar-date="2026-03-16"]')).toContainText('欧阳测试甲');
  await expect(page.locator('[data-calendar-date="2026-03-17"]')).toContainText('欧阳测试甲');
});

test('移动端月历仅显示单月并可切换月份', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const monthHeadings = page.getByRole('heading').filter({ hasText: /\d{4}年\d+月/ });
  await expect(monthHeadings).toHaveCount(1);

  const currentMonth = await monthHeadings.first().textContent();
  await page.getByRole('button', { name: '下个月' }).click();

  if (currentMonth) {
    await expect(page.getByRole('heading', { name: currentMonth })).toHaveCount(0);
  }
  await expect(page.getByRole('heading').filter({ hasText: /\d{4}年\d+月/ })).toHaveCount(1);
});

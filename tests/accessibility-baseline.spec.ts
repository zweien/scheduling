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

test('移动端更多菜单按钮暴露可访问名称和展开状态', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const menuButton = page.getByRole('button', { name: '打开更多菜单' });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await menuButton.click();

  await expect(page.getByRole('button', { name: '关闭更多菜单' })).toHaveAttribute('aria-expanded', 'true');
});

test('自动排班弹窗关闭按钮使用中文可访问名称', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭对话框' })).toBeVisible();
});

test('右键菜单打开后焦点进入首个菜单项并可通过 Esc 关闭', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });

  const firstMenuItem = page.getByRole('menuitem', { name: '自动排班' });
  await expect(firstMenuItem).toBeVisible();
  await expect(firstMenuItem).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(firstMenuItem).toHaveCount(0);
});

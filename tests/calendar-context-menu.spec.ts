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

test('右键空日期显示自动排班和安排值班人员', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '自动排班' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '安排值班人员' })).toBeVisible();
});

test('右键已有排班日期显示替换、移动、删除', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator('[data-calendar-date="2026-03-16"]').click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '替换值班人员' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '移动到其他日期' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除排班' })).toBeVisible();
});

test('右键空日期选择自动排班后打开对话框并带默认值', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();

  await expect(page.getByRole('heading', { name: '自动排班' })).toBeVisible();
  await expect(page.getByLabel('连续天数')).toHaveValue('2');
  await expect(page.getByLabel('延续现有排班（推荐）')).toBeVisible();
  await expect(page.getByLabel('从首位人员开始')).toBeVisible();
});

test('自动排班可按选定起点模式连续安排后续值班', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();
  await page.getByLabel('连续天数').fill('3');
  await page.getByLabel('从首位人员开始').check();
  await page.getByRole('button', { name: '确认自动排班' }).click();

  await expect(page.locator('[data-calendar-date="2026-03-17"]')).toContainText('张三');
  await expect(page.locator('[data-calendar-date="2026-03-18"]')).toContainText('李四');
  await expect(page.locator('[data-calendar-date="2026-03-19"]')).toContainText('张三');
});

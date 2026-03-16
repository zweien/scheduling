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

function seedCalendarData() {
  ensureUsersSchema();
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('UPDATE accounts SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);

  db.prepare(
    "INSERT INTO users (id, name, sort_order, is_active, organization, category, notes) VALUES (1, ?, 1, 1, 'X', 'J', '')"
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

test('月历视图悬停排班日期时显示人员详情 tooltip', async ({ page }) => {
  await login(page);

  const tooltip = page.getByTestId('schedule-tooltip');

  await expect(tooltip).toHaveCount(1);
  await expect(tooltip).toHaveCSS('opacity', '0');

  await page.locator('[draggable="true"]').first().hover();

  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('张三');
  await expect(tooltip).toContainText('X');
  await expect(tooltip).toContainText('J');
});

test('深色主题下 tooltip 不应使用白色背景', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'dark');
  });

  await login(page);

  const tooltip = page.getByTestId('schedule-tooltip');
  await page.locator('[draggable="true"]').first().hover();
  await expect(tooltip).toBeVisible();

  const backgroundColor = await tooltip.evaluate(element => window.getComputedStyle(element).backgroundColor);
  expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
});

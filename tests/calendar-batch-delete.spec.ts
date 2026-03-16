import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function seedCalendarData() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();

  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (1, ?, 1, 1)').run('张三');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (2, ?, 2, 1)').run('李四');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (3, ?, 3, 1)').run('王五');

  const today = new Date();
  const date1 = formatDate(today);
  const date2 = formatDate(addDays(today, 1));
  const date3 = formatDate(addDays(today, 2));

  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run(date1, 1);
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run(date2, 2);
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run(date3, 3);

  return { date1, date2, date3 };
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test('月历视图支持多选、全选当月并批量删除排班', async ({ page }) => {
  const seeded = seedCalendarData();

  await login(page);
  await page.getByRole('button', { name: '切换为姓名' }).click();

  await page.locator(`[data-calendar-date="${seeded.date1}"]`).click();
  await page.locator(`[data-calendar-date="${seeded.date2}"]`).click({ modifiers: ['Control'] });

  await expect(page.getByText('已选择 2 天')).toBeVisible();
  await expect(page.getByRole('button', { name: '批量删除' })).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '批量删除' }).click();

  await expect(page.getByText('张三')).toHaveCount(0);
  await expect(page.getByText('李四')).toHaveCount(0);
  await expect(page.getByText('王五')).toHaveCount(1);

  const remainingDates = db.prepare('SELECT date FROM schedules ORDER BY date').all() as Array<{ date: string }>;
  expect(remainingDates.map(item => item.date)).toEqual([seeded.date3]);

  const batchDeleteLog = db.prepare('SELECT action, target, old_value, new_value FROM logs WHERE action = ? ORDER BY id DESC LIMIT 1')
    .get('batch_delete_schedules') as { action: string; target: string; old_value: string | null; new_value: string | null } | undefined;

  expect(batchDeleteLog).toBeTruthy();
  expect(batchDeleteLog?.target).toContain(seeded.date1);
  expect(batchDeleteLog?.target).toContain(seeded.date2);
  expect(batchDeleteLog?.new_value).toContain('已删除 2 条排班');

  await page.getByRole('button', { name: '全选当月' }).click();
  await expect(page.getByText('已选择 1 天')).toBeVisible();
  await page.getByRole('button', { name: '取消选择' }).click();
  await expect(page.getByText('已选择 0 天')).toBeVisible();
});

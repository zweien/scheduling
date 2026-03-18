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
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (2, ?, 2, 1)').run('李四');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (3, ?, 3, 1)').run('王五');

  // 使用固定的月内日期，避免月末边界问题
  const date1 = '2026-03-16';
  const date2 = '2026-03-17';
  const date3 = '2026-03-18';

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

  await page.locator(`[data-calendar-date="${seeded.date1}"]`).click({ modifiers: ['Control'] });
  await page.locator(`[data-calendar-date="${seeded.date2}"]`).click({ modifiers: ['Control'] });

  const actionBar = page.getByTestId('selected-schedules-action-bar');
  await expect(actionBar).toBeVisible();
  await expect(actionBar).toContainText('已选择 2 天');
  await expect(actionBar.getByRole('button', { name: '批量编辑' })).toBeVisible();
  await expect(actionBar.getByRole('button', { name: '导出已选' })).toBeVisible();
  await expect(actionBar.getByRole('button', { name: '批量删除' })).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await actionBar.getByRole('button', { name: '批量删除' }).click();

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
  await expect(actionBar).toContainText('已选择 1 天');
  await page.getByRole('button', { name: '取消选择' }).click();
  await expect(actionBar).toHaveCount(0);
});

test('底部浮动栏支持批量编辑已选日期为同一值班人员', async ({ page }) => {
  const seeded = seedCalendarData();

  await login(page);
  await page.getByRole('button', { name: '切换为姓名' }).click();

  await page.locator(`[data-calendar-date="${seeded.date1}"]`).click({ modifiers: ['Control'] });
  await page.locator(`[data-calendar-date="${seeded.date2}"]`).click({ modifiers: ['Control'] });

  const actionBar = page.getByTestId('selected-schedules-action-bar');
  await actionBar.getByRole('button', { name: '批量编辑' }).click();

  await expect(page.getByRole('heading', { name: '选择值班人员' })).toBeVisible();
  await page.getByRole('button', { name: '王五' }).click();

  await expect(page.locator(`[data-calendar-date="${seeded.date1}"]`)).toContainText('王五');
  await expect(page.locator(`[data-calendar-date="${seeded.date2}"]`)).toContainText('王五');
  await expect(actionBar).toHaveCount(0);

  const updatedSchedules = db.prepare('SELECT date, user_id FROM schedules WHERE date IN (?, ?) ORDER BY date')
    .all(seeded.date1, seeded.date2) as Array<{ date: string; user_id: number }>;
  expect(updatedSchedules).toEqual([
    { date: seeded.date1, user_id: 3 },
    { date: seeded.date2, user_id: 3 },
  ]);

  const batchReplaceLog = db.prepare('SELECT action, target, new_value FROM logs WHERE action = ? ORDER BY id DESC LIMIT 1')
    .get('batch_replace_schedules') as { action: string; target: string; new_value: string | null } | undefined;

  expect(batchReplaceLog).toBeTruthy();
  expect(batchReplaceLog?.target).toContain(seeded.date1);
  expect(batchReplaceLog?.target).toContain(seeded.date2);
  expect(batchReplaceLog?.new_value).toContain('王五');
});

test('底部浮动栏支持导出已选日期', async ({ page }) => {
  const seeded = seedCalendarData();

  await login(page);

  await page.locator(`[data-calendar-date="${seeded.date1}"]`).click({ modifiers: ['Control'] });
  await page.locator(`[data-calendar-date="${seeded.date3}"]`).click({ modifiers: ['Control'] });

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('selected-schedules-action-bar').getByRole('button', { name: '导出已选' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('已选');
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
});

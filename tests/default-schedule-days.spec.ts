import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedSettingsData() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('UPDATE accounts SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);
  db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run('default_schedule_days', '21');
}

function seedGeneratorData(defaultDays = '4') {
  seedSettingsData();
  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES
      (1, '张三', 1, 1, 'W', 'W', ''),
      (2, '李四', 2, 1, 'W', 'W', '')
  `).run();
  db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run('default_schedule_days', defaultDays);
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  seedSettingsData();
});

test('管理员可在设置页修改默认排班天数', async ({ page }) => {
  await login(page);
  await page.goto(`${baseUrl}/dashboard/settings`);

  await expect(page.getByRole('heading', { name: '默认排班天数' })).toBeVisible();
  await expect(page.getByLabel('默认排班天数')).toHaveValue('21');

  await page.getByLabel('默认排班天数').fill('14');
  await page.getByRole('button', { name: '保存默认排班天数' }).click();

  await expect(page.getByLabel('默认排班天数')).toHaveValue('14');
});

test('只填开始日期时按配置值提示并生成默认排班天数', async ({ page }) => {
  seedGeneratorData('4');
  await login(page);

  await expect(page.getByText('不填将默认排 4 天')).toBeVisible();
  await page.getByLabel('开始日期').fill('2026-04-01');
  await page.getByRole('button', { name: '生成排班' }).click();

  await expect.poll(() =>
    db.prepare('SELECT COUNT(*) as count FROM schedules WHERE date >= ? AND date <= ?')
      .get('2026-04-01', '2026-04-04').count
  ).toBe(4);
});

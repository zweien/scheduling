import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.PLAYWRIGHT_USERNAME || 'admin';
const adminPassword = process.env.PLAYWRIGHT_PASSWORD || '123456';
const userUsername = 'audit_user';
const userPassword = 'audit-user-123';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function resetData() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('DELETE FROM api_tokens').run();
  db.prepare('DELETE FROM accounts WHERE username = ?').run(userUsername);
  db.prepare('UPDATE accounts SET password_hash = ?, role = ?, is_active = 1 WHERE username = ?')
    .run(hashPassword(adminPassword), 'admin', adminUsername);
  db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(userUsername, '审计普通用户', hashPassword(userPassword), 'user');
}

function createUser(name: string) {
  const nextSortOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS sortOrder FROM users').get() as { sortOrder: number };
  const result = db.prepare('INSERT INTO users (name, sort_order, is_active) VALUES (?, ?, 1)').run(name, nextSortOrder.sortOrder);
  return Number(result.lastInsertRowid);
}

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  resetData();
});

test('Web 日志记录操作用户、来源与 IP，并支持搜索', async ({ page }) => {
  await login(page, adminUsername, adminPassword);

  await page.goto(`${baseUrl}/dashboard/logs`);

  await expect(page.getByLabel('操作用户')).toBeVisible();
  await expect(page.getByLabel('来源')).toBeVisible();
  await expect(page.getByText('IP 地址', { exact: true })).toBeVisible();

  await page.getByPlaceholder('搜索操作类型、对象、用户或 IP').fill('admin');
  await expect(page.locator('div.font-medium').filter({ hasText: /^admin$/ }).first()).toBeVisible();
  await expect(page.locator('span').filter({ hasText: 'WEB' }).first()).toBeVisible();
  await expect(page.getByText(/127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/)).toBeVisible();
});

test('API 写操作可记录来源并支持筛选导出', async ({ page }) => {
  const suffix = Date.now().toString();
  const userId = createUser(`API日志用户${suffix}`);

  await login(page, adminUsername, adminPassword);

  const createdToken = await page.evaluate(async (name) => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    return await response.json();
  }, `audit-token-${suffix}`);

  const response = await page.request.patch(`${baseUrl}/api/schedules/2030-01-15`, {
    headers: {
      Authorization: `Bearer ${createdToken.token}`,
      'Content-Type': 'application/json',
    },
    data: { userId },
  });

  expect(response.ok()).toBeTruthy();

  await page.goto(`${baseUrl}/dashboard/logs`);

  await page.getByLabel('来源').selectOption('api');
  await page.getByLabel('操作类型').selectOption('replace_schedule');
  await page.getByPlaceholder('搜索操作类型、对象、用户或 IP').fill('2030-01-15');

  await expect(page.locator('span').filter({ hasText: 'API' }).first()).toBeVisible();
  await expect(page.locator('div.font-medium').filter({ hasText: new RegExp(`^token:audit-token-${suffix}$`) }).first()).toBeVisible();
  await expect(page.getByText('2030-01-15')).toBeVisible();

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  const jsonFile = await jsonDownload;
  const jsonPath = path.join(os.tmpdir(), `logs-${suffix}.json`);
  await jsonFile.saveAs(jsonPath);
  const jsonContent = await fs.readFile(jsonPath, 'utf8');
  expect(jsonContent).toContain('audit-token-');
  expect(jsonContent).toContain('"source": "api"');

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 CSV' }).click();
  const csvFile = await csvDownload;
  const csvPath = path.join(os.tmpdir(), `logs-${suffix}.csv`);
  await csvFile.saveAs(csvPath);
  const csvContent = await fs.readFile(csvPath, 'utf8');
  expect(csvContent).toContain('operator_username');
  expect(csvContent).toContain(`token:audit-token-${suffix}`);
});

test('普通用户 API 写操作被拒绝时不记录成功写日志', async ({ page, request }) => {
  const suffix = Date.now().toString();
  const userId = createUser(`普通用户日志${suffix}`);

  await login(page, userUsername, userPassword);

  const createdToken = await page.evaluate(async (name) => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    return await response.json();
  }, `user-audit-token-${suffix}`);

  const response = await request.patch(`${baseUrl}/api/schedules/2030-01-16`, {
    headers: {
      Authorization: `Bearer ${createdToken.token}`,
      'Content-Type': 'application/json',
    },
    data: { userId },
  });

  expect(response.status()).toBe(403);

  const forbiddenLog = db.prepare(`
    SELECT COUNT(*) AS count
    FROM logs
    WHERE action = 'replace_schedule'
      AND source = 'api'
      AND target LIKE ?
  `).get('%2030-01-16%') as { count: number };

  expect(forbiddenLog.count).toBe(0);
});

test('日志页面显示换班理由', async ({ page }) => {
  db.prepare(`
    INSERT INTO logs (
      action,
      target,
      old_value,
      new_value,
      reason,
      operator_username,
      operator_role,
      ip_address,
      source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'swap_schedule',
    '交换: 2026-03-16 <-> 2026-03-17',
    '张三 <-> 李四',
    '李四 <-> 张三',
    '临时互换白夜班安排说明',
    adminUsername,
    'admin',
    '127.0.0.1',
    'web'
  );

  await login(page, adminUsername, adminPassword);
  await page.goto(`${baseUrl}/dashboard/logs`);

  await expect(page.getByText('临时互换白夜班安排说明')).toBeVisible();
});

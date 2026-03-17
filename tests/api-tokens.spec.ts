import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from 'playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.PLAYWRIGHT_USERNAME || 'admin';
const adminPassword = process.env.PLAYWRIGHT_PASSWORD || '123456';
const userUsername = 'token_user';
const userPassword = 'token-user-123';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function resetData() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  try {
    db.prepare('DELETE FROM api_tokens').run();
  } catch {
    // 表尚未创建时忽略
  }

  db.prepare('DELETE FROM accounts WHERE username = ?').run(userUsername);
  db.prepare('UPDATE accounts SET password_hash = ?, role = ?, is_active = 1 WHERE username = ?')
    .run(hashPassword(adminPassword), 'admin', adminUsername);
  db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(userUsername, 'Token 普通用户', hashPassword(userPassword), 'user');
}

async function login(page: import('playwright/test').Page, username: string, password: string) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  resetData();
});

test('管理员会话可以创建和列出自己的 token', async ({ page }) => {
  await login(page, adminUsername, adminPassword);

  const created = await page.evaluate(async () => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'playwright-token' }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  });

  expect(created.status).toBe(200);
  expect(created.body.name).toBe('playwright-token');
  expect(created.body.token).toMatch(/^sch_/);
  expect(created.body.prefix).toMatch(/^sch_/);

  const listed = await page.evaluate(async () => {
    const response = await fetch('/api/tokens');
    return {
      status: response.status,
      body: await response.json(),
    };
  });

  expect(listed.status).toBe(200);
  expect(listed.body).toHaveLength(1);
  expect(listed.body[0].name).toBe('playwright-token');
  expect(listed.body[0].token).toBeUndefined();
});

test('普通用户会话可以创建和列出自己的 token', async ({ page, browser }) => {
  await login(page, adminUsername, adminPassword);

  await page.evaluate(async () => {
    await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'admin-only-token' }),
    });
  });

  const userPage = await browser.newPage();
  await login(userPage, userUsername, userPassword);

  const created = await userPage.evaluate(async () => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'user-token' }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  });

  expect(created.status).toBe(200);
  expect(created.body.name).toBe('user-token');
  expect(created.body.token).toMatch(/^sch_/);

  const listed = await userPage.evaluate(async () => {
    const response = await fetch('/api/tokens');
    return {
      status: response.status,
      body: await response.json(),
    };
  });

  expect(listed.status).toBe(200);
  expect(listed.body).toHaveLength(1);
  expect(listed.body[0].name).toBe('user-token');

  await userPage.close();
});

test('普通用户不能禁用其他账号的 token', async ({ page, browser }) => {
  await login(page, adminUsername, adminPassword);

  const created = await page.evaluate(async () => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'admin-token' }),
    });
    return await response.json();
  });

  const userPage = await browser.newPage();
  await login(userPage, userUsername, userPassword);

  const forbidden = await userPage.evaluate(async ({ id }) => {
    const response = await fetch(`/api/tokens/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: true }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  }, { id: created.id });

  expect(forbidden.status).toBe(404);
  await expect(forbidden.body).toMatchObject({
    error: {
      code: 'NOT_FOUND',
    },
  });

  await userPage.close();
});

test('普通用户会话可以禁用自己的 token', async ({ page }) => {
  await login(page, userUsername, userPassword);

  const created = await page.evaluate(async () => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'disable-me' }),
    });
    return await response.json();
  });

  const disabled = await page.evaluate(async ({ id }) => {
    const response = await fetch(`/api/tokens/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: true }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  }, { id: created.id });

  expect(disabled.status).toBe(200);
  expect(disabled.body.disabledAt).toBeTruthy();
});

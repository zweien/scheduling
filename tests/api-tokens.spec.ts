import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from 'playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
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
}

async function login(page: import('playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  resetData();
});

test('已登录会话可以创建和列出 token', async ({ page }) => {
  await login(page);

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

test('已登录会话可以禁用 token', async ({ page }) => {
  await login(page);

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

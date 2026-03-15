import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from 'playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedSchedules() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  try {
    db.prepare('DELETE FROM api_tokens').run();
  } catch {
    // 表尚未创建时忽略
  }

  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (1, ?, 1, 1)').run('张三');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (2, ?, 2, 1)').run('李四');
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-03-16', 1);
}

async function login(page: import('playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

async function createToken(page: import('playwright/test').Page) {
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'api-test-token' }),
    });

    return await response.json();
  });

  return result.token as string;
}

test.beforeEach(() => {
  seedSchedules();
});

test('缺少 Bearer Token 时返回 401', async ({ request }) => {
  const response = await request.get(`${baseUrl}/api/schedules?start=2026-03-16&end=2026-03-16`);

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'UNAUTHORIZED',
    },
  });
});

test('Bearer Token 可以查询排班与人员', async ({ page, request }) => {
  await login(page);
  const token = await createToken(page);

  const schedulesResponse = await request.get(`${baseUrl}/api/schedules?start=2026-03-16&end=2026-03-16`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(schedulesResponse.status()).toBe(200);
  await expect(schedulesResponse.json()).resolves.toEqual([
    expect.objectContaining({
      date: '2026-03-16',
      isManual: false,
      user: expect.objectContaining({
        id: 1,
        name: '张三',
        isActive: true,
      }),
    }),
  ]);

  const usersResponse = await request.get(`${baseUrl}/api/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(usersResponse.status()).toBe(200);
  await expect(usersResponse.json()).resolves.toEqual([
    expect.objectContaining({ id: 1, name: '张三', isActive: true }),
    expect.objectContaining({ id: 2, name: '李四', isActive: true }),
  ]);
});

test('Bearer Token 可以按日期修改排班', async ({ page, request }) => {
  await login(page);
  const token = await createToken(page);

  const response = await request.patch(`${baseUrl}/api/schedules/2026-03-16`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      userId: 2,
    },
  });

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    date: '2026-03-16',
    user: expect.objectContaining({
      id: 2,
      name: '李四',
    }),
    isManual: true,
  });
});

import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from 'playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.PLAYWRIGHT_USERNAME || 'admin';
const adminPassword = process.env.PLAYWRIGHT_PASSWORD || '123456';
const userUsername = 'api_user';
const userPassword = 'api-user-123';
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

  db.prepare('DELETE FROM accounts WHERE username = ?').run(userUsername);
  db.prepare('UPDATE accounts SET password_hash = ?, role = ?, is_active = 1 WHERE username = ?')
    .run(hashPassword(adminPassword), 'admin', adminUsername);
  db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(userUsername, 'API 普通用户', hashPassword(userPassword), 'user');

  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (1, ?, 1, 1)').run('张三');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (2, ?, 2, 1)').run('李四');
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-03-16', 1);
}

async function login(page: import('playwright/test').Page, username: string, password: string) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

async function createToken(page: import('playwright/test').Page, name = 'api-test-token') {
  const result = await page.evaluate(async (tokenName) => {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tokenName }),
    });

    return await response.json();
  }, name);

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
  await login(page, adminUsername, adminPassword);
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

test('普通用户 Bearer Token 仅能查询，不能修改排班', async ({ page, request }) => {
  await login(page, userUsername, userPassword);
  const token = await createToken(page, 'user-readonly-token');

  const response = await request.patch(`${baseUrl}/api/schedules/2026-03-16`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      userId: 2,
    },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'FORBIDDEN',
    },
  });
});

test('管理员 Bearer Token 可以按日期修改排班', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'admin-write-token');

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

test('月历 markdown 接口缺少 Bearer Token 时返回 401', async ({ request }) => {
  const response = await request.get(`${baseUrl}/api/schedules/monthly-markdown?month=2026-03`);

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'UNAUTHORIZED',
    },
  });
});

test('Bearer Token 可以按月查询 markdown 值班表', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'monthly-markdown-token');

  const response = await request.get(`${baseUrl}/api/schedules/monthly-markdown?month=2026-03`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('text/markdown; charset=utf-8');

  const markdown = await response.text();
  expect(markdown).toContain('# 2026年3月值班表');
  expect(markdown).toContain('| 周一 | 周二 | 周三 | 周四 | 周五 | 周六 | 周日 |');
  expect(markdown).toContain('16 张三');
});

test('月历 markdown 接口缺少或非法 month 时返回 400', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'monthly-markdown-invalid-month-token');

  const missing = await request.get(`${baseUrl}/api/schedules/monthly-markdown`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(missing.status()).toBe(400);
  await expect(missing.json()).resolves.toMatchObject({
    error: {
      code: 'INVALID_INPUT',
    },
  });

  const invalid = await request.get(`${baseUrl}/api/schedules/monthly-markdown?month=2026-13`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(invalid.status()).toBe(400);
  await expect(invalid.json()).resolves.toMatchObject({
    error: {
      code: 'INVALID_INPUT',
    },
  });
});

test('查询接口成功后写入 api_request 日志', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'api-log-read-token');

  const response = await request.get(`${baseUrl}/api/schedules?start=2026-03-16&end=2026-03-16`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);

  const log = db.prepare(`
    SELECT action, target, new_value, operator_username, operator_role, source
    FROM logs
    WHERE action = 'api_request'
    ORDER BY id DESC
    LIMIT 1
  `).get() as {
    action: string;
    target: string;
    new_value: string | null;
    operator_username: string | null;
    operator_role: string | null;
    source: string | null;
  };

  expect(log).toMatchObject({
    action: 'api_request',
    target: 'GET /api/schedules 200',
    new_value: 'OK',
    operator_username: 'token:api-log-read-token',
    operator_role: 'admin',
    source: 'api',
  });
});

test('未带 token 的 401 也会写入 api_request 日志', async ({ request }) => {
  const response = await request.get(`${baseUrl}/api/schedules?start=2026-03-16&end=2026-03-16`);

  expect(response.status()).toBe(401);

  const log = db.prepare(`
    SELECT target, new_value, operator_username, operator_role, source
    FROM logs
    WHERE action = 'api_request'
    ORDER BY id DESC
    LIMIT 1
  `).get() as {
    target: string;
    new_value: string | null;
    operator_username: string | null;
    operator_role: string | null;
    source: string | null;
  };

  expect(log).toMatchObject({
    target: 'GET /api/schedules 401',
    new_value: 'UNAUTHORIZED',
    operator_username: 'anonymous',
    operator_role: null,
    source: 'api',
  });
});

test('monthly-markdown 成功与 month 参数错误都会写入 api_request 日志', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'api-log-monthly-token');

  const success = await request.get(`${baseUrl}/api/schedules/monthly-markdown?month=2026-03`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(success.status()).toBe(200);

  const successLog = db.prepare(`
    SELECT target, new_value
    FROM logs
    WHERE action = 'api_request'
    ORDER BY id DESC
    LIMIT 1
  `).get() as {
    target: string;
    new_value: string | null;
  };

  expect(successLog).toMatchObject({
    target: 'GET /api/schedules/monthly-markdown 200',
    new_value: 'OK',
  });

  const invalid = await request.get(`${baseUrl}/api/schedules/monthly-markdown?month=2026-13`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(invalid.status()).toBe(400);

  const invalidLog = db.prepare(`
    SELECT target, new_value
    FROM logs
    WHERE action = 'api_request'
    ORDER BY id DESC
    LIMIT 1
  `).get() as {
    target: string;
    new_value: string | null;
  };

  expect(invalidLog).toMatchObject({
    target: 'GET /api/schedules/monthly-markdown 400',
    new_value: 'INVALID_INPUT',
  });
});

test('leaders 查询成功后写入 api_request 日志', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'api-log-leaders-token');

  const response = await request.get(`${baseUrl}/api/leaders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);

  const log = db.prepare(`
    SELECT target, new_value, operator_username
    FROM logs
    WHERE action = 'api_request'
    ORDER BY id DESC
    LIMIT 1
  `).get() as {
    target: string;
    new_value: string | null;
    operator_username: string | null;
  };

  expect(log).toMatchObject({
    target: 'GET /api/leaders 200',
    new_value: 'OK',
    operator_username: 'token:api-log-leaders-token',
  });
});

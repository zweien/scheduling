import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from 'playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.PLAYWRIGHT_USERNAME || 'admin';
const adminPassword = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

// 复用 /api/schedules 测试的种子方式，并补充节假日相关排班：
//  - 2026-01-01 元旦（法定节假日）
//  - 2026-01-04 元旦调休补班（工作日）
//  - 2026-01-10 周六（周末）
//  - 2026-03-16 周一（普通工作日）
function seedSchedules() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  try {
    db.prepare('DELETE FROM api_tokens').run();
  } catch {
    // 表尚未创建时忽略
  }

  db.prepare('UPDATE accounts SET password_hash = ?, role = ?, is_active = 1 WHERE username = ?')
    .run(hashPassword(adminPassword), 'admin', adminUsername);

  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (1, ?, 1, 1)').run('张三');
  db.prepare('INSERT INTO users (id, name, sort_order, is_active) VALUES (2, ?, 2, 1)').run('李四');

  // 张三：元旦（节假日）+ 元旦补班（调休）+ 周六（周末）= 3 天
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-01-01', 1);
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-01-04', 1);
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-01-10', 1);
  // 李四：周一普通工作日 = 1 天
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 0)').run('2026-03-16', 2);
}

async function login(page: import('playwright/test').Page, username: string, password: string) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

async function createToken(page: import('playwright/test').Page, name = 'api-stats-token') {
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
  const response = await request.get(`${baseUrl}/api/schedules/stats?start=2026-01-01&end=2026-12-31`);

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'UNAUTHORIZED',
    },
  });
});

test('缺少 start 或 end 参数时返回 400', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'stats-missing-params-token');

  const response = await request.get(`${baseUrl}/api/schedules/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'INVALID_INPUT',
    },
  });
});

test('Bearer Token 返回含节假日分类的年度值班统计', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'stats-yearly-token');

  const response = await request.get(`${baseUrl}/api/schedules/stats?start=2026-01-01&end=2026-12-31`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({
    range: { start: '2026-01-01', end: '2026-12-31' },
    total: 4,
    userCount: 2,
    stats: [
      expect.objectContaining({
        userId: 1,
        userName: '张三',
        count: 3,
        restDayCount: 2,
        holidayCount: 1,
        adjustedWorkdayCount: 1,
        restDays: [
          { date: '2026-01-01', name: '元旦', type: 'holiday' },
          { date: '2026-01-10', type: 'weekend' },
        ],
      }),
      expect.objectContaining({
        userId: 2,
        userName: '李四',
        count: 1,
        restDayCount: 0,
        holidayCount: 0,
        adjustedWorkdayCount: 0,
      }),
    ],
  });
});

test('stats 查询成功后写入 api_request 日志', async ({ page, request }) => {
  await login(page, adminUsername, adminPassword);
  const token = await createToken(page, 'stats-api-log-token');

  const response = await request.get(`${baseUrl}/api/schedules/stats?start=2026-01-01&end=2026-12-31`, {
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
    target: 'GET /api/schedules/stats 200',
    new_value: 'OK',
    operator_username: 'token:stats-api-log-token',
    operator_role: 'admin',
    source: 'api',
  });
});

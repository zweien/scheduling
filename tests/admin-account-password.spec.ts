import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.PLAYWRIGHT_USERNAME || 'admin';
const adminPassword = process.env.PLAYWRIGHT_PASSWORD || '123456';
const memberUsername = 'member_reset_target';
const memberPassword = 'member-old-pass';
const nextPassword = 'member-new-pass';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function resetAccounts() {
  db.prepare('DELETE FROM accounts WHERE username = ?').run(memberUsername);
  db.prepare('UPDATE accounts SET password_hash = ?, role = ?, is_active = 1 WHERE username = ?')
    .run(hashPassword(adminPassword), 'admin', adminUsername);
  db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(username) DO UPDATE SET
      display_name = excluded.display_name,
      password_hash = excluded.password_hash,
      role = excluded.role,
      is_active = excluded.is_active
  `).run(memberUsername, '待重置成员', hashPassword(memberPassword), 'user');
}

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  resetAccounts();
});

test('管理员可在账号管理页修改成员密码', async ({ page }) => {
  await login(page, adminUsername, adminPassword);

  await page.goto(`${baseUrl}/dashboard/accounts`);

  const memberCard = page.locator('div.rounded-2xl').filter({ hasText: '待重置成员' }).first();
  await expect(memberCard).toBeVisible();
  await memberCard.getByRole('button', { name: '修改密码' }).click();

  await expect(page.getByRole('heading', { name: '修改成员密码' })).toBeVisible();
  await page.getByLabel('新密码', { exact: true }).fill(nextPassword);
  await page.getByLabel('确认新密码', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: '确认修改' }).click();

  await expect(page.getByText('密码修改成功')).toBeVisible();

  await page.getByRole('button', { name: /退出/ }).click();
  await page.waitForURL(baseUrl);

  await login(page, memberUsername, nextPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
});

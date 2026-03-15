import { expect, test } from 'playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';

async function login(page: import('playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test('dashboard 提供 token 管理入口', async ({ page }) => {
  await login(page);

  await page.locator('a[href="/dashboard/settings"]').first().click();

  await expect(page.getByText('API Token 配置')).toBeVisible();
  await expect(page.getByRole('button', { name: '生成 Token' })).toBeVisible();
});

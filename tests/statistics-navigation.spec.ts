import { test, expect } from 'playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';

async function login(page: import('playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('**/dashboard');
}

test('列表视图下统计按钮可以跳转', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '列表' }).click();
  await page.getByRole('link', { name: '统计' }).click();

  await expect(page).toHaveURL(/\/dashboard\/statistics$/);
});

test('月历视图下统计按钮可以跳转', async ({ page }) => {
  await login(page);

  await page.getByRole('link', { name: '统计' }).click();

  await expect(page).toHaveURL(/\/dashboard\/statistics$/);
});

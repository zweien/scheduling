import { test, expect } from 'playwright/test';

const baseUrl = 'http://127.0.0.1:3001';

async function login(page: import('playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('密码').fill('idrl123456');
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

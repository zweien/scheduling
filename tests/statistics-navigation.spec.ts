import { test, expect } from 'playwright/test';

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

test('列表视图下统计按钮可以跳转', async ({ page }) => {
  await login(page);
  const statisticsLink = page.locator('header').getByRole('link', { name: '统计', exact: true });

  await page.getByRole('button', { name: '列表' }).click();
  await expect(statisticsLink).toBeVisible();
  await statisticsLink.click();

  await expect(page).toHaveURL(/\/dashboard\/statistics$/);
});

test('月历视图下统计按钮可以跳转', async ({ page }) => {
  await login(page);
  const statisticsLink = page.locator('header').getByRole('link', { name: '统计', exact: true });

  await expect(page.getByRole('heading', { name: '值班日历' })).toBeVisible();
  await expect(statisticsLink).toBeVisible();
  await statisticsLink.click();

  await expect(page).toHaveURL(/\/dashboard\/statistics$/);
});

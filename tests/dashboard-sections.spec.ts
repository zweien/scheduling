import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test('右上角导航可进入独立功能页面', async ({ page }) => {
  await login(page);

  await page.locator('a[href="/dashboard/statistics"]').first().click();
  await expect(page).toHaveURL(/\/dashboard\/statistics$/);
  await expect(page.getByRole('heading', { name: '值班统计' })).toBeVisible();

  await page.locator('a[href="/dashboard/logs"]').first().click();
  await expect(page).toHaveURL(/\/dashboard\/logs$/);
  await expect(page.getByRole('heading', { name: '操作日志' })).toBeVisible();

  await page.locator('a[href="/dashboard/print"]').first().click();
  await expect(page).toHaveURL(/\/dashboard\/print$/);
  await expect(page.getByRole('heading', { name: '打印排班表' })).toBeVisible();

  await page.locator('a[href="/dashboard/export"]').first().click();
  await expect(page).toHaveURL(/\/dashboard\/export$/);
  await expect(page.getByRole('heading', { name: '导出排班表' })).toBeVisible();

  await page.locator('a[href="/dashboard/settings"]').first().click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(page.getByRole('heading', { name: 'API Token 配置' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '修改密码' })).toBeVisible();
});

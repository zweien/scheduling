import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test('右上角导航可进入独立功能页面', async ({ page }) => {
  await login(page);
  const header = page.locator('header');
  await expect(page.getByRole('heading', { name: '值班日历' })).toBeVisible();
  await expect(header.getByText(/^版本 v/i)).toBeVisible();
  const headerHeight = await header.evaluate(element => element.getBoundingClientRect().height);
  expect(headerHeight).toBeGreaterThanOrEqual(64);

  await expect(header.getByRole('link', { name: '统计', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: '值班人员', exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/dashboard/statistics`);
  await expect(page).toHaveURL(/\/dashboard\/statistics$/);
  await expect(page.getByRole('heading', { name: '值班统计' })).toBeVisible();

  await page.goto(`${baseUrl}/dashboard/users`);
  await expect(page).toHaveURL(/\/dashboard\/users$/);
  await expect(page.getByRole('heading', { name: '值班人员管理' })).toBeVisible();

  await expect(header.getByRole('link', { name: '日志', exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/dashboard/logs`);
  await expect(page).toHaveURL(/\/dashboard\/logs$/);
  await expect(page.getByRole('heading', { name: '操作日志' })).toBeVisible();

  await expect(header.getByRole('link', { name: '打印', exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/dashboard/print`);
  await expect(page).toHaveURL(/\/dashboard\/print$/);
  await expect(page.getByRole('heading', { name: '打印排班表' })).toBeVisible();

  await expect(header.getByRole('link', { name: '导出', exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/dashboard/export`);
  await expect(page).toHaveURL(/\/dashboard\/export$/);
  await expect(page.getByRole('heading', { name: '导出排班表' })).toBeVisible();

  await expect(header.getByRole('link', { name: '设置', exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/dashboard/settings`);
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(page.getByRole('heading', { name: '修改密码' })).toBeVisible();

  await expect(header.getByRole('link', { name: '账号管理', exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/dashboard/accounts`);
  await expect(page).toHaveURL(/\/dashboard\/accounts$/);
  await expect(page.getByRole('heading', { name: '系统用户管理' })).toBeVisible();
});

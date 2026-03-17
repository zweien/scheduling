import { expect, test } from 'playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';

test('登录页展示品牌卖点与错误提示', async ({ page }) => {
  await page.goto(baseUrl);

  await expect(page.getByText('值班安排，更清晰地协作。')).toBeVisible();
  await expect(page.getByText('自动排班')).toBeVisible();
  await expect(page.getByText('统计与日志')).toBeVisible();

  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill('wrong-password');
  await page.getByRole('button', { name: '登录系统' }).click();

  await expect(page.getByText('用户名或密码错误')).toBeVisible();
});

test('登录成功后显示成功提醒', async ({ page }) => {
  await page.goto(baseUrl);

  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByText('登录成功')).toBeVisible();
});

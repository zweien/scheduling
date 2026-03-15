import { expect, test } from 'playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

test('登录页展示品牌卖点与错误提示', async ({ page }) => {
  await page.goto(baseUrl);

  await expect(page.getByText('值班安排，更清晰地协作。')).toBeVisible();
  await expect(page.getByText('自动排班')).toBeVisible();
  await expect(page.getByText('统计与日志')).toBeVisible();

  await page.getByLabel('密码').fill('wrong-password');
  await page.getByRole('button', { name: '登录系统' }).click();

  await expect(page.getByText('密码错误')).toBeVisible();
});

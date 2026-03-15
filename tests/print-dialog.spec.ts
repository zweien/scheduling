import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test('打印弹窗支持切换到日历模式预览', async ({ page }) => {
  await login(page);

  await page.getByRole('link', { name: '打印' }).click();
  await page.waitForURL('**/dashboard/print');
  await expect(page.getByRole('heading', { name: '打印排班表' })).toBeVisible();

  await page.getByRole('button', { name: '日历模式' }).click();
  await page.getByRole('button', { name: '预览' }).click();

  await expect(page.getByTestId('print-calendar-preview')).toBeVisible();
  await expect(page.getByText('预览模式')).toBeVisible();
  await expect(page.getByText('日历模式', { exact: true })).toBeVisible();
});

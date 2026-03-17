import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.PLAYWRIGHT_USERNAME || 'admin';
const adminPassword = process.env.PLAYWRIGHT_PASSWORD || '123456';

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test('管理员可开启注册，普通用户注册后受权限限制', async ({ page }) => {
  const suffix = Date.now().toString();
  const newUser = `user_${suffix}`;
  const newPassword = `pass_${suffix}`;

  await login(page, adminUsername, adminPassword);

  await page.goto(`${baseUrl}/dashboard/settings`);
  await expect(page.getByRole('heading', { name: '注册设置' })).toBeVisible();
  await expect(page.locator('a[href="/dashboard/accounts"]').first()).toBeVisible();

  const registrationSwitch = page.getByRole('switch');
  const wasEnabled = (await registrationSwitch.getAttribute('aria-checked')) === 'true';
  if (!wasEnabled) {
    await registrationSwitch.click();
    await expect(registrationSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('注册设置已开启')).toBeVisible();
  }

  await page.getByRole('button', { name: /退出/ }).click();
  await page.waitForURL(baseUrl);

  await page.getByRole('link', { name: '立即注册' }).click();
  await page.waitForURL('**/register');
  await page.getByLabel('显示名称').fill(`测试用户${suffix}`);
  await page.getByLabel('用户名').fill(newUser);
  await page.getByLabel('密码', { exact: true }).fill(newPassword);
  await page.getByLabel('确认密码', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: '注册并进入系统' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByText('注册成功')).toBeVisible();

  await expect(page.locator('a[href="/dashboard/accounts"]')).toHaveCount(0);

  await page.goto(`${baseUrl}/dashboard/settings`);
  await expect(page.getByRole('heading', { name: '修改密码' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '注册设置' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'API Token 配置' })).toHaveCount(0);

  await page.goto(`${baseUrl}/dashboard/users`);
  await expect(page.getByRole('heading', { name: '值班人员管理' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '检索与筛选' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下载模板' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开始导入' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '新增人员' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '编辑' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '停用' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0);

  await page.goto(`${baseUrl}/dashboard/accounts`);
  await page.waitForURL('**/dashboard');

  if (!wasEnabled) {
    await page.getByRole('button', { name: /退出/ }).click();
    await page.waitForURL(baseUrl);
    await login(page, adminUsername, adminPassword);
    await page.goto(`${baseUrl}/dashboard/settings`);
    await page.getByRole('switch').click();
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('注册设置已关闭')).toBeVisible();
  }
});

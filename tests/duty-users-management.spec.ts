import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function seedUsers() {
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(1, '张三', 1, 1, 'W', 'J', '一组');
  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(2, '李四', 2, 1, 'X', 'W', '二组');
  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(3, '王五', 3, 0, 'Z', 'J', '后备');
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  seedUsers();
});

test('管理员可进入值班人员页面并按条件筛选检索', async ({ page }) => {
  await login(page);

  const header = page.locator('header');
  await expect(header.getByRole('link', { name: '值班人员', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: '账号管理', exact: true })).toBeVisible();

  await page.goto(`${baseUrl}/dashboard/users`);
  await expect(page.getByRole('heading', { name: '值班人员管理' })).toBeVisible();

  await page.locator('#duty-user-organization').selectOption('X');
  await expect(page.getByText('李四')).toBeVisible();
  await expect(page.getByText('张三')).toHaveCount(0);

  await page.locator('#duty-user-organization').selectOption('');
  await page.locator('#duty-user-category').selectOption('J');
  await expect(page.getByText('张三')).toBeVisible();
  await expect(page.getByText('王五')).toBeVisible();
  await expect(page.getByText('李四')).toHaveCount(0);

  await page.locator('#duty-user-category').selectOption('');
  await page.getByPlaceholder('搜索姓名或备注').fill('后备');
  await expect(page.getByText('王五')).toBeVisible();
  await expect(page.getByText('张三')).toHaveCount(0);
});

test('管理员可全选并批量删除值班人员，筛选变化会清空已选项', async ({ page }) => {
  await login(page);
  await page.goto(`${baseUrl}/dashboard/users`);

  const batchDeleteButton = page.getByRole('button', { name: '删除选中人员' });
  await expect(batchDeleteButton).toBeDisabled();

  await page.getByLabel('全选当前列表').click();
  await expect(batchDeleteButton).toBeEnabled();
  await expect(batchDeleteButton).toContainText('删除选中人员 (3)');

  await page.locator('#duty-user-organization').selectOption('X');
  await expect(batchDeleteButton).toBeDisabled();
  await expect(batchDeleteButton).toContainText('删除选中人员');

  await page.getByLabel('全选当前列表').click();
  await expect(batchDeleteButton).toContainText('删除选中人员 (1)');

  let confirmMessage = '';
  page.on('dialog', async dialog => {
    confirmMessage = dialog.message();
    await dialog.accept();
  });

  await batchDeleteButton.click();

  expect(confirmMessage).toContain('确认删除选中的 1 名值班人员吗？');
  await expect(page.getByText('李四')).toHaveCount(0);

  const deletedUser = db.prepare('SELECT COUNT(*) AS count FROM users WHERE name = ?')
    .get('李四') as { count: number };
  expect(deletedUser.count).toBe(0);
});

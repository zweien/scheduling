import path from 'path';
import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';
import { hashPassword } from '../src/lib/password';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.PLAYWRIGHT_USERNAME || 'admin';
const password = process.env.PLAYWRIGHT_PASSWORD || '123456';
const db = new Database(path.join(process.cwd(), 'data', 'scheduling.db'));

function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some(column => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function ensureUsersSchema() {
  addColumnIfMissing('users', 'is_active', 'INTEGER DEFAULT 1');
  addColumnIfMissing('users', 'organization', "TEXT NOT NULL DEFAULT 'W'");
  addColumnIfMissing('users', 'category', "TEXT NOT NULL DEFAULT 'W'");
  addColumnIfMissing('users', 'notes', "TEXT DEFAULT ''");
}

function ensureSchedulesSchema() {
  addColumnIfMissing('schedules', 'original_user_id', 'INTEGER');
  addColumnIfMissing('schedules', 'adjust_reason', 'TEXT');
}

// 使用当前月的月中日期，保证日历默认视图能直接看到造数数据，且避开月初/月末边界
function getTargetDates() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    scheduledDate: `${month}-16`,
    emptyDate: `${month}-17`,
    nextDate: `${month}-18`,
    thirdDate: `${month}-19`,
  };
}

function seedCalendarData() {
  ensureUsersSchema();
  ensureSchedulesSchema();
  const { scheduledDate } = getTargetDates();
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM logs').run();
  db.prepare('DELETE FROM leader_schedules').run();
  db.prepare('DELETE FROM leaders').run();
  db.prepare('UPDATE accounts SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);

  db.prepare(`
    INSERT INTO users (id, name, sort_order, is_active, organization, category, notes)
    VALUES
      (1, '张三', 1, 1, 'W', 'W', ''),
      (2, '李四', 2, 1, 'W', 'W', '')
  `).run();
  db.prepare('INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, 1)').run(scheduledDate, 1);
  db.prepare(`
    INSERT INTO leaders (id, name, sort_order, is_active)
    VALUES
      (1, '王领导', 1, 1),
      (2, '赵领导', 2, 1)
  `).run();
  db.prepare('INSERT INTO leader_schedules (date, leader_id, is_manual) VALUES (?, 1, 1)').run(scheduledDate);
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeEach(() => {
  seedCalendarData();
});

test('右键空日期显示自动排班和安排值班人员', async ({ page }) => {
  const { emptyDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator(`[data-calendar-date="${emptyDate}"]`).click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '自动排班' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '安排值班人员' })).toBeVisible();
});

test('窄窗口桌面端仍可打开右键菜单', async ({ page }) => {
  const { emptyDate } = getTargetDates();
  await page.setViewportSize({ width: 600, height: 900 });
  await login(page);

  await page.locator(`[data-calendar-date="${emptyDate}"]`).click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '自动排班' })).toBeVisible();
});

test('右键已有排班日期显示替换、移动、删除', async ({ page }) => {
  const { scheduledDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator(`[data-calendar-date="${scheduledDate}"]`).click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '替换值班人员' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '移动到其他日期' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除排班' })).toBeVisible();
});

test('右键空日期选择自动排班后打开对话框并带默认值', async ({ page }) => {
  const { emptyDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator(`[data-calendar-date="${emptyDate}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();

  await expect(page.getByRole('heading', { name: '自动排班' })).toBeVisible();
  await expect(page.getByLabel('连续天数')).toHaveValue('2');
  await expect(page.getByLabel('延续现有排班（推荐）')).toBeVisible();
  await expect(page.getByLabel('从首位人员开始')).toBeVisible();
});

test('自动排班可按选定起点模式连续安排后续值班', async ({ page }) => {
  const { emptyDate, nextDate, thirdDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator(`[data-calendar-date="${emptyDate}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();
  await page.getByLabel('连续天数').fill('3');
  await page.getByLabel('从首位人员开始').check();
  await page.getByRole('button', { name: '确认自动排班' }).click();

  await expect(page.locator(`[data-calendar-date="${emptyDate}"]`)).toContainText('张三');
  await expect(page.locator(`[data-calendar-date="${nextDate}"]`)).toContainText('李四');
  await expect(page.locator(`[data-calendar-date="${thirdDate}"]`)).toContainText('张三');
});

test('自动排班失败时显示错误信息并保持对话框打开', async ({ page }) => {
  const { scheduledDate } = getTargetDates();
  const prevDate = `${scheduledDate.slice(0, 8)}15`;
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.locator(`[data-calendar-date="${prevDate}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();
  await page.getByLabel('连续天数').fill('2');
  await page.getByRole('button', { name: '确认自动排班' }).click();

  await expect(page.getByText('所选范围内已有排班')).toBeVisible();
  await expect(page.getByRole('heading', { name: '自动排班' })).toBeVisible();
});

test('领导视图右键已有值班领导的日期显示替换和删除值班领导', async ({ page }) => {
  const { scheduledDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '领导', exact: true }).click();
  await page.locator(`[data-calendar-date="${scheduledDate}"]`).click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '替换值班领导' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除值班领导' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除排班' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: '安排值班人员' })).toHaveCount(0);
});

test('领导视图右键空日期显示安排值班领导', async ({ page }) => {
  const { emptyDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '领导', exact: true }).click();
  await page.locator(`[data-calendar-date="${emptyDate}"]`).click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '安排值班领导' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除值班领导' })).toHaveCount(0);
});

test('领导视图右键删除值班领导后日期恢复为空', async ({ page }) => {
  const { scheduledDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '领导', exact: true }).click();
  const cell = page.locator(`[data-calendar-date="${scheduledDate}"]`);
  await cell.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '删除值班领导' }).click();

  await expect(cell).not.toContainText('王领导');

  await cell.click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: '安排值班领导' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除值班领导' })).toHaveCount(0);
});

test('领导视图右键安排值班领导可选择并保存', async ({ page }) => {
  const { emptyDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '领导', exact: true }).click();
  await page.locator(`[data-calendar-date="${emptyDate}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '安排值班领导' }).click();
  await page.getByRole('button', { name: '赵领导' }).click();

  await expect(page.locator(`[data-calendar-date="${emptyDate}"]`)).toContainText('赵领导');
});

test('全部视图右键同时显示值班员和值班领导操作', async ({ page }) => {
  const { scheduledDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.locator(`[data-calendar-date="${scheduledDate}"]`).click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: '替换值班人员' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除排班' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '替换值班领导' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除值班领导' })).toBeVisible();
});

test('领导视图单击已排值班领导的日期显示删除按钮并可删除', async ({ page }) => {
  const { scheduledDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '领导', exact: true }).click();
  await page.locator(`[data-calendar-date="${scheduledDate}"]`).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const deleteButton = dialog.getByRole('button', { name: '删除本日值班领导' });
  await expect(deleteButton).toBeVisible();

  await deleteButton.click();
  await expect(page.locator(`[data-calendar-date="${scheduledDate}"]`)).not.toContainText('王领导');
});

test('领导视图单击空日期不显示删除按钮', async ({ page }) => {
  const { emptyDate } = getTargetDates();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.getByRole('button', { name: '领导', exact: true }).click();
  await page.locator(`[data-calendar-date="${emptyDate}"]`).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '删除本日值班领导' })).toHaveCount(0);
});

# Calendar Context Menu Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为桌面端排班月历增加日期右键菜单，并为空日期提供“自动排班”对话框，支持从当前日期开始按人员顺序连续安排 N 天。

**Architecture:** 右键菜单只作为桌面端入口层，真正动作继续复用 `CalendarView` 的现有左键/移动/删除流程。新增的业务能力集中在一个自动排班对话框和一条最小 server action，后端通过新的顺序生成 helper 基于启用人员顺序安排连续日期。

**Tech Stack:** Next.js 16, React 19, TypeScript, better-sqlite3, date-fns, Playwright, Node test runner

---

## 文件结构

**Create:**
- `src/components/CalendarContextMenu.tsx`
- `src/components/AutoScheduleDialog.tsx`
- `tests/calendar-context-menu.spec.ts`
- `tests/auto-schedule-from-date.test.mjs`

**Modify:**
- `src/components/CalendarCell.tsx`
- `src/components/CalendarView.tsx`
- `src/app/actions/schedule.ts`
- `src/lib/schedule.ts`
- `src/lib/logs.ts`
- `src/components/LogDialog.tsx`
- `src/types/index.ts`
- `tests/log-audit.spec.ts`

**Why these files:**
- `CalendarCell.tsx` 负责透传右键事件。
- `CalendarView.tsx` 负责菜单状态、动作分发和自动排班弹窗状态。
- `CalendarContextMenu.tsx` 只负责菜单渲染和关闭行为。
- `AutoScheduleDialog.tsx` 只负责收集连续天数和起点模式。
- `schedule.ts` / `app/actions/schedule.ts` 负责新增“从当前日期连续自动排班”的业务动作。
- `logs.ts`、`LogDialog.tsx`、`types/index.ts` 负责把新日志动作纳入现有审计链。
- 测试文件分别覆盖桌面端交互和后端顺序生成逻辑。

## Chunk 1: 后端连续自动排班能力

### Task 1: 先补服务层失败测试

**Files:**
- Create: `tests/auto-schedule-from-date.test.mjs`
- Modify: `src/lib/schedule.ts`
- Modify: `src/app/actions/schedule.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/auto-schedule-from-date.test.mjs` 建立最小用例，至少覆盖：

```js
test('from_first 模式从首位启用人员开始连续排班', () => {
  // 断言起始日和后续日期按 sort_order 依次排入
});

test('continue 模式从起始日前最近排班人员的下一位开始', () => {
  // 先插入历史排班，再断言起点顺延
});

test('目标范围存在已有排班时拒绝执行', async () => {
  // 断言返回 success: false
});

test('没有启用人员时拒绝执行', async () => {
  // 断言返回 success: false
});
```

测试直接使用测试数据库和真实函数，不做 mock。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
node --test "tests/auto-schedule-from-date.test.mjs"
```

Expected: FAIL，原因是相关 helper / action 尚不存在。

- [ ] **Step 3: 补类型定义**

在 `src/types/index.ts` 增加最小类型：

```ts
export type AutoScheduleStartMode = 'continue' | 'from_first';
```

并把 `Action` 扩展为：

```ts
| 'auto_schedule_from_date'
```

- [ ] **Step 4: 实现最小 helper**

在 `src/lib/schedule.ts` 新增专用 helper，例如：

```ts
export function generateScheduleFromDate(startDate: string, days: number, startMode: AutoScheduleStartMode)
```

实现规则：
- 只读取启用人员顺序
- `from_first` 从首位启用人员开始
- `continue` 从起始日前最近排班人员的下一位开始，找不到就回退到首位
- 范围内若任一天已有排班，直接抛错
- 使用现有 `setSchedule`

不要把现有 `generateSchedule()` 改成胖接口。

- [ ] **Step 5: 实现最小 action**

在 `src/app/actions/schedule.ts` 新增：

```ts
export async function autoScheduleFromDateAction(startDate: string, days: number, startMode: AutoScheduleStartMode)
```

要求：
- `requireAdmin()`
- 校验起始日期为空日期
- 调用新 helper
- `addWebLog('auto_schedule_from_date', ...)`
- `revalidatePath('/dashboard')`
- 返回 `{ success: true } | { success: false, error: string }`

- [ ] **Step 6: 跑测试确认通过**

Run:

```bash
node --test "tests/auto-schedule-from-date.test.mjs"
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add tests/auto-schedule-from-date.test.mjs src/lib/schedule.ts src/app/actions/schedule.ts src/types/index.ts
git commit -m "feat: 增加连续自动排班能力"
```

## Chunk 2: 右键菜单与自动排班弹窗

### Task 2: 先补桌面端右键菜单失败测试

**Files:**
- Create: `tests/calendar-context-menu.spec.ts`
- Modify: `src/components/CalendarCell.tsx`
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: 写失败测试**

在 `tests/calendar-context-menu.spec.ts` 至少覆盖：

```ts
test('右键空日期显示自动排班和安排值班人员', async ({ page }) => {
  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: '自动排班' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '安排值班人员' })).toBeVisible();
});

test('右键已有排班日期显示替换、移动、删除', async ({ page }) => {
  await page.locator('[data-calendar-date="2026-03-16"]').click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: '替换值班人员' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '移动到其他日期' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '删除排班' })).toBeVisible();
});
```

测试只在桌面端跑，不扩展移动端长按。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，原因是当前没有自定义右键菜单。

- [ ] **Step 3: 最小实现菜单组件与事件透传**

实现：
- `src/components/CalendarContextMenu.tsx`
- `CalendarCell.tsx` 增加 `onContextMenu`
- `CalendarView.tsx` 新增 `contextMenuState`

菜单项规则：
- 空日期：`自动排班`、`安排值班人员`
- 已有排班：`替换值班人员`、`移动到其他日期`、`删除排班`

要求：
- 阻止浏览器默认菜单
- 点击外部关闭
- `Esc` 关闭
- 无管理权限不打开菜单

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/CalendarCell.tsx src/components/CalendarView.tsx src/components/CalendarContextMenu.tsx tests/calendar-context-menu.spec.ts
git commit -m "feat: 增加月历右键菜单入口"
```

### Task 3: 补自动排班弹窗与菜单动作测试

**Files:**
- Create: `src/components/AutoScheduleDialog.tsx`
- Modify: `src/components/CalendarView.tsx`
- Modify: `tests/calendar-context-menu.spec.ts`

- [ ] **Step 1: 扩展失败测试**

在 `tests/calendar-context-menu.spec.ts` 追加：

```ts
test('右键空日期选择自动排班后打开对话框并带默认值', async ({ page }) => {
  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();

  await expect(page.getByRole('heading', { name: '自动排班' })).toBeVisible();
  await expect(page.getByLabel('连续天数')).toHaveValue('2');
  await expect(page.getByLabel('排班起点', { exact: false })).toBeVisible();
});
```

默认值里的 `2` 取决于测试种子里当前启用人员数量。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，原因是当前还没有自动排班弹窗。

- [ ] **Step 3: 实现最小弹窗**

新增 `src/components/AutoScheduleDialog.tsx`，只负责：
- 起始日期只读显示
- 连续天数输入
- 起点模式单选：`continue` / `from_first`
- 确认 / 取消

在 `CalendarView.tsx`：
- 新增 `autoScheduleDialogState`
- 点击空日期右键菜单的 `自动排班` 时打开弹窗
- 默认连续天数取 `users.filter(user => user.is_active).length`

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/AutoScheduleDialog.tsx src/components/CalendarView.tsx tests/calendar-context-menu.spec.ts
git commit -m "feat: 增加自动排班弹窗"
```

## Chunk 3: 联通业务动作与日志

### Task 4: 把自动排班弹窗接上 action，并补日志回归

**Files:**
- Modify: `src/components/CalendarView.tsx`
- Modify: `src/app/actions/schedule.ts`
- Modify: `src/lib/logs.ts`
- Modify: `src/components/LogDialog.tsx`
- Modify: `tests/calendar-context-menu.spec.ts`
- Modify: `tests/log-audit.spec.ts`

- [ ] **Step 1: 扩展失败测试**

在 `tests/calendar-context-menu.spec.ts` 增加：

```ts
test('自动排班可按选定起点模式连续安排后续值班', async ({ page }) => {
  await page.locator('[data-calendar-date="2026-03-17"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '自动排班' }).click();
  await page.getByLabel('连续天数').fill('3');
  await page.getByLabel('从首位人员开始').check();
  await page.getByRole('button', { name: '确认自动排班' }).click();

  await expect(page.locator('[data-calendar-date="2026-03-17"]')).toContainText('张');
  await expect(page.locator('[data-calendar-date="2026-03-18"]')).toContainText('李');
});
```

在 `tests/log-audit.spec.ts` 增加新日志动作断言：

```ts
await expect(page.getByText('自动排班')).toBeVisible();
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" "tests/log-audit.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，原因是自动排班动作和日志还未真正接通。

- [ ] **Step 3: 接通业务动作**

在 `CalendarView.tsx`：
- 提交自动排班弹窗时调用 `autoScheduleFromDateAction`
- 成功后关闭菜单和弹窗并刷新

在 `src/lib/logs.ts` 与 `src/components/LogDialog.tsx`：
- 为 `auto_schedule_from_date` 提供展示文案和 badge

- [ ] **Step 4: 跑定向测试确认通过**

Run:

```bash
node --test "tests/auto-schedule-from-date.test.mjs"
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" "tests/log-audit.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 做联合回归**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-context-menu.spec.ts" "tests/calendar-drag-adjustment-reason.spec.ts" "tests/calendar-mobile-move-mode.spec.ts" "tests/dashboard-sections.spec.ts" "tests/log-audit.spec.ts" --reporter=line --workers=1
npm run lint
```

Expected:
- 所有 Playwright PASS
- `npm run lint` PASS

- [ ] **Step 6: 提交收尾**

```bash
git add src/components/CalendarView.tsx src/app/actions/schedule.ts src/lib/logs.ts src/components/LogDialog.tsx tests/calendar-context-menu.spec.ts tests/log-audit.spec.ts
git commit -m "feat: 支持月历右键自动排班"
```

# Issue #4 Drag Schedule Reason Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为月历拖拽移动/交换排班增加理由必填确认，并在日历中展示最初值班员与最终值班员，同时把理由完整写入日志。

**Architecture:** 采用“两阶段确认”拖拽方案：`drop` 只生成待确认操作并弹出理由对话框，真正写库在用户确认后发生。数据层通过给 `schedules` 增加 `original_user_id` / `adjust_reason`，给 `logs` 增加 `reason`，用最小迁移支撑“原/现”展示和可追溯日志。

**Tech Stack:** Next.js 16, React 19, TypeScript, better-sqlite3, Playwright, Node test runner

---

## 文件结构

**Create:**
- `src/components/ScheduleAdjustmentReasonDialog.tsx`
- `tests/schedule-adjustment-actions.test.mjs`
- `tests/calendar-drag-adjustment-reason.spec.ts`

**Modify:**
- `src/lib/db/migrations.ts`
- `src/types/index.ts`
- `src/lib/schedules.ts`
- `src/lib/logs.ts`
- `src/app/actions/schedule.ts`
- `src/components/CalendarView.tsx`
- `src/components/CalendarCell.tsx`
- `src/components/LogDialog.tsx`
- `tests/db-migrations.test.mjs`
- `tests/log-audit.spec.ts`

**Why these files:**
- `migrations.ts` 负责新增字段与历史数据回填。
- `types/index.ts` 负责补齐 `Schedule` / `Log` 的字段类型。
- `schedules.ts` 负责把“原始人员 + 最后理由”纳入排班读写模型。
- `logs.ts` 负责把 `reason` 变成日志一等字段，而不是拼进字符串。
- `schedule.ts` 负责拖拽移动/交换的 server action 校验与写日志。
- `CalendarView.tsx` 负责拖拽两阶段确认和状态管理。
- `CalendarCell.tsx` 负责月历格中的“原/现”展示。
- `ScheduleAdjustmentReasonDialog.tsx` 只负责收集和确认理由。
- 测试文件分别覆盖迁移、action、拖拽交互、日志展示。

## Chunk 1: 数据模型与迁移

### Task 1: 为迁移补失败测试

**Files:**
- Modify: `tests/db-migrations.test.mjs`
- Modify: `src/lib/db/migrations.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/db-migrations.test.mjs` 增加断言：

```js
test('迁移后 schedules 和 logs 包含拖拽换班需要的字段', () => {
  const scheduleColumns = db.prepare("PRAGMA table_info(schedules)").all();
  const logColumns = db.prepare("PRAGMA table_info(logs)").all();

  assert(scheduleColumns.some(column => column.name === 'original_user_id'));
  assert(scheduleColumns.some(column => column.name === 'adjust_reason'));
  assert(logColumns.some(column => column.name === 'reason'));
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
node --test "tests/db-migrations.test.mjs"
```

Expected: FAIL，提示缺少新增列。

- [ ] **Step 3: 实现最小迁移**

在 `src/lib/db/migrations.ts` 新增 migration：

- `006_schedule_adjustment_reason`
- 给 `schedules` 增加：
  - `original_user_id INTEGER`
  - `adjust_reason TEXT`
- 给 `logs` 增加：
  - `reason TEXT`
- 对现有 `schedules` 执行一次回填：

```ts
database.prepare(`
  UPDATE schedules
  SET original_user_id = user_id
  WHERE original_user_id IS NULL
`).run();
```

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
node --test "tests/db-migrations.test.mjs"
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/lib/db/migrations.ts tests/db-migrations.test.mjs
git commit -m "feat: 增加换班理由相关迁移"
```

### Task 2: 补齐类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 先查看现有类型**

Run:

```bash
sed -n '1,240p' "src/types/index.ts"
```

Expected: 看到 `Schedule`、`ScheduleWithUser`、`Log`、`Action` 定义。

- [ ] **Step 2: 最小补字段**

在类型中补充：

```ts
type Schedule = {
  original_user_id: number | null;
  adjust_reason: string | null;
};

type Log = {
  reason: string | null;
};
```

并确认 `Action` 包含：

```ts
'move_schedule' | 'swap_schedule'
```

- [ ] **Step 3: 跑 lint 做静态校验**

Run:

```bash
npm run lint
```

Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/types/index.ts
git commit -m "feat: 补充换班理由相关类型"
```

## Chunk 2: 排班与日志后端能力

### Task 3: 为拖拽 action 补失败测试

**Files:**
- Create: `tests/schedule-adjustment-actions.test.mjs`
- Modify: `src/lib/schedules.ts`
- Modify: `src/lib/logs.ts`
- Modify: `src/app/actions/schedule.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/schedule-adjustment-actions.test.mjs` 建立最小用例，覆盖：

```js
test('moveSchedule 未传理由时失败', async () => {
  const result = await moveSchedule('2026-03-17', '2026-03-18', '');
  assert.equal(result.success, false);
});

test('moveSchedule 成功后保留 original_user_id 并写入 adjust_reason', async () => {
  // 断言目标日期 user_id 更新
  // 断言 original_user_id 仍为初始人员
  // 断言 adjust_reason = 输入理由
});

test('swapSchedules 成功后两侧 original_user_id 不被覆盖并写日志理由', async () => {
  // 断言 logs.reason 被写入
});
```

测试不要 mock，直接用测试数据库和真实 action/库函数。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
node --test "tests/schedule-adjustment-actions.test.mjs"
```

Expected: FAIL，原因是 action 尚未要求理由，或记录字段尚未维护。

- [ ] **Step 3: 最小实现排班写入规则**

在 `src/lib/schedules.ts`：

- 扩展 `setSchedule` 支持传入可选元信息，例如：

```ts
setSchedule(date, userId, isManual, {
  originalUserId,
  adjustReason,
})
```

- 插入或更新时满足：
  - `original_user_id` 如为空则补当前或传入值
  - `adjust_reason` 仅在显式传入时更新

必要时拆出更专一的 helper，避免 `setSchedule` 变成胖接口。

- [ ] **Step 4: 最小实现日志 reason**

在 `src/lib/logs.ts`：

- `insertLog` / `addLog` / `addWebLog` / `addApiLog` 增加可选 `reason`
- `exportLogsAsCsv` 和 `getLogs()` 输出包含 `reason`

保持向后兼容，旧调用不必全部改。

- [ ] **Step 5: 最小改造拖拽 action**

在 `src/app/actions/schedule.ts`：

- `moveSchedule(fromDate, toDate, reason)`
- `swapSchedules(date1, date2, reason)`
- 先做 `trim()`
- 长度限制：`10-200`
- 校验失败返回：

```ts
{ success: false, error: '请填写 10-200 字的调整理由' }
```

- 移动逻辑：
  - 读取源记录的 `original_user_id`
  - 目标新记录的 `original_user_id` 继承源记录最初人员
  - 删除源记录
- 交换逻辑：
  - 两边互换 `user_id`
  - 两边各自保留自己的 `original_user_id`
  - 两边都更新 `adjust_reason`
- 写日志时把理由落到 `reason` 列

- [ ] **Step 6: 跑测试确认通过**

Run:

```bash
node --test "tests/schedule-adjustment-actions.test.mjs"
node --test "tests/db-migrations.test.mjs"
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/lib/schedules.ts src/lib/logs.ts src/app/actions/schedule.ts tests/schedule-adjustment-actions.test.mjs tests/db-migrations.test.mjs
git commit -m "feat: 为拖拽换班增加理由和原始人员记录"
```

## Chunk 3: 月历拖拽确认交互

### Task 4: 为理由对话框交互补 Playwright 失败用例

**Files:**
- Create: `tests/calendar-drag-adjustment-reason.spec.ts`
- Modify: `src/components/CalendarView.tsx`
- Create: `src/components/ScheduleAdjustmentReasonDialog.tsx`

- [ ] **Step 1: 写失败测试**

在 `tests/calendar-drag-adjustment-reason.spec.ts` 覆盖以下行为：

```ts
test('拖拽到目标日期后弹出理由对话框', async ({ page }) => {
  // drag source -> target
  // expect dialog title 可见
});

test('不填理由不能确认', async ({ page }) => {
  // 直接点确认
  // expect 校验提示
});

test('取消后不落库', async ({ page }) => {
  // 打开 dialog 后取消
  // 断言数据库未变
});
```

使用稳定定位：

- `data-calendar-date`
- 对话框标题/按钮文本
- 数据库断言

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，因为当前拖拽直接落库且没有对话框。

- [ ] **Step 3: 新建理由对话框组件**

在 `src/components/ScheduleAdjustmentReasonDialog.tsx` 实现最小组件：

- props:
  - `open`
  - `actionType`
  - `sourceDate`
  - `targetDate`
  - `sourceUserName`
  - `targetUserName`
  - `onConfirm(reason: string)`
  - `onClose()`
- UI:
  - 标题：`确认移动排班` / `确认交换排班`
  - 文本域
  - 错误提示
  - `取消` / `确认调整`

- [ ] **Step 4: 改造 CalendarView 为两阶段确认**

在 `src/components/CalendarView.tsx`：

- 新增 `pendingDragAction` 状态
- `handleDrop` 不直接调 action，只生成：

```ts
{
  type: 'move' | 'swap',
  sourceDate,
  targetDate,
  sourceUserName,
  targetUserName,
}
```

- 新增 `handleConfirmDragAction(reason)`
  - 根据 `type` 调 `moveSchedule` / `swapSchedules`
  - 成功后关闭对话框并 `loadData()`
  - 失败后显示错误 toast / 保留对话框
- 保留现有 `dragend` 清理视觉状态逻辑

- [ ] **Step 5: 跑用例确认通过**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/CalendarView.tsx src/components/ScheduleAdjustmentReasonDialog.tsx tests/calendar-drag-adjustment-reason.spec.ts
git commit -m "feat: 为拖拽换班增加理由确认弹窗"
```

## Chunk 4: 月历原/现展示与日志页展示

### Task 5: 为月历“原/现”展示补测试

**Files:**
- Modify: `src/components/CalendarCell.tsx`
- Modify: `tests/calendar-drag-adjustment-reason.spec.ts`

- [ ] **Step 1: 先扩展失败测试**

在现有 Playwright 用例中增加：

```ts
await expect(page.locator('[data-calendar-date="2026-03-18"]')).toContainText('原：张三');
await expect(page.locator('[data-calendar-date="2026-03-18"]')).toContainText('现：李四');
```

只对发生调整的日期断言；未调整日期仍维持旧展示。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，因为月历格尚未渲染 `original_user_id` 对应人员。

- [ ] **Step 3: 最小实现 CalendarCell 展示**

在 `src/components/CalendarCell.tsx`：

- 当 `schedule.original_user` 存在且 `schedule.original_user.id !== schedule.user.id` 时，显示：

```tsx
<div>原：{schedule.original_user.name}</div>
<div>现：{schedule.user.name}</div>
```

- 其他情况保留原有头像/姓名模式

如果当前 `ScheduleWithUser` 还不包含 `original_user`，先在 `src/lib/schedules.ts` 的查询映射中补出。

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/CalendarCell.tsx src/lib/schedules.ts tests/calendar-drag-adjustment-reason.spec.ts
git commit -m "feat: 在月历中展示原始和值班人员"
```

### Task 6: 为日志理由展示补测试

**Files:**
- Modify: `src/components/LogDialog.tsx`
- Modify: `tests/log-audit.spec.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/log-audit.spec.ts` 加入断言：

```ts
test('拖拽换班日志显示理由', async ({ page }) => {
  // 先制造一条带 reason 的 move/swap 日志
  // 进入日志页
  // 断言理由内容可见
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/log-audit.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，因为日志页当前不显示 `reason`。

- [ ] **Step 3: 最小实现日志页展示**

在 `src/components/LogDialog.tsx`：

- 在合适位置增加“理由”列或详情展示
- 对无理由日志保持空值兼容，不影响旧记录

不要顺手重构整个日志页，只加必要展示。

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/log-audit.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/LogDialog.tsx tests/log-audit.spec.ts
git commit -m "feat: 在日志页展示换班理由"
```

## Chunk 5: 完整回归与收尾

### Task 7: 全量回归并整理交付

**Files:**
- Modify: none unless verification exposes issue

- [ ] **Step 1: 跑聚合验证**

Run:

```bash
node --test "tests/db-migrations.test.mjs" "tests/schedule-adjustment-actions.test.mjs"
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" "tests/calendar-move-schedule.spec.ts" "tests/log-audit.spec.ts" --reporter=line --workers=1
npm run lint
```

Expected: 全部 PASS

- [ ] **Step 2: 检查工作区**

Run:

```bash
git status --short
```

Expected: 只剩本次改动或既有未跟踪文件。

- [ ] **Step 3: 最终提交**

```bash
git add <本次实际改动文件>
git commit -m "feat: 拖拽换班强制填写理由并展示原现值班员"
```

- [ ] **Step 4: 推送并创建 PR**

```bash
git push -u origin <branch>
gh pr create --base master --head <branch> --title "feat: 拖拽换班强制填写理由并展示原现值班员（close #4）" --body "<中文 PR 描述>"
```

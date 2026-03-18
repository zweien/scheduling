# Issue #22 Mobile Single Month Calendar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `640px` 以下让月历视图仅显示单月，并提供明确的前后月份切换按钮，同时保持桌面端双月视图不变。

**Architecture:** 只改 `CalendarView` 的布局层和月份导航，继续复用现有 `MonthCalendar`、月份状态和排班交互。通过客户端断点状态决定渲染一个还是两个月份面板，用 Playwright 先写失败测试再补最小实现。

**Tech Stack:** Next.js 16, React 19, TypeScript, date-fns, Playwright

---

## 文件结构

**Modify:**
- `src/components/CalendarView.tsx`
- `tests/calendar-mobile-move-mode.spec.ts`
- `tests/dashboard-sections.spec.ts`

**Why these files:**
- `CalendarView.tsx` 已经持有月份状态、双月布局和月份切换逻辑，是本次唯一需要改业务代码的组件。
- `calendar-mobile-move-mode.spec.ts` 已有移动端月历基线，适合补“只显示单月”和“单月翻月”回归。
- `dashboard-sections.spec.ts` 已有桌面端首页基线，适合补“桌面仍显示双月”的断言。

## Chunk 1: 失败测试先行

### Task 1: 补移动端单月视图与翻月失败测试

**Files:**
- Modify: `tests/calendar-mobile-move-mode.spec.ts`
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: 写失败测试**

在 `tests/calendar-mobile-move-mode.spec.ts` 增加一条移动端用例：

```ts
test('移动端月历仅显示单月并可切换月份', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await expect(page.getByRole('heading', { name: /\d{4}年\d+月/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /\d{4}年\d+月/ })).toHaveCount(1);

  const currentMonth = await page.getByRole('heading', { name: /\d{4}年\d+月/ }).first().textContent();
  await page.getByRole('button', { name: '下个月' }).click();
  await expect(page.getByRole('heading', { name: currentMonth ?? '' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /\d{4}年\d+月/ })).toHaveCount(1);
});
```

这条测试只验证：
- 移动端月份标题只有一个
- 能通过按钮切换月份

不要在这里顺手覆盖拖拽或姓名模式。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-mobile-move-mode.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，原因是当前移动端仍然渲染两个月份标题，且没有明确的上月/下月按钮。

- [ ] **Step 3: 提交测试变更**

```bash
git add tests/calendar-mobile-move-mode.spec.ts
git commit -m "test: 补充移动端单月视图回归"
```

### Task 2: 补桌面端仍保持双月的失败测试

**Files:**
- Modify: `tests/dashboard-sections.spec.ts`
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: 写失败测试**

在 `tests/dashboard-sections.spec.ts` 首页断言中补上：

```ts
const monthHeadings = page.getByRole('heading').filter({ hasText: /\d{4}年\d+月/ });
await expect(monthHeadings).toHaveCount(2);
```

只断言桌面端仍有两个月份标题，不绑定具体月份名称，避免跨月脆弱性。

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/dashboard-sections.spec.ts" --reporter=line --workers=1
```

Expected: 初次失败或尚未能稳定断言月份标题数量，促使实现提供清晰结构。

- [ ] **Step 3: 提交测试变更**

```bash
git add tests/dashboard-sections.spec.ts
git commit -m "test: 补充桌面端双月视图回归"
```

## Chunk 2: 最小实现

### Task 3: 在 CalendarView 中按断点切换单月/双月布局

**Files:**
- Modify: `src/components/CalendarView.tsx`
- Test: `tests/calendar-mobile-move-mode.spec.ts`
- Test: `tests/dashboard-sections.spec.ts`

- [ ] **Step 1: 阅读现有月份状态与渲染**

Run:

```bash
sed -n '1,260p' "src/components/CalendarView.tsx"
```

Expected: 看到 `currentMonth`、`nextMonth`、两个 `MonthCalendar` 渲染块，以及顶部现有月份切换按钮位置。

- [ ] **Step 2: 写最小布局状态**

在 `CalendarView.tsx` 增加一个只读布局状态：

```ts
const [isMobileSingleMonthLayout, setIsMobileSingleMonthLayout] = useState(false);
```

并在 `useEffect` 中基于：

```ts
window.matchMedia('(max-width: 639px)')
```

同步它。

要求：
- 监听断点变化
- 清理监听器
- 不影响现有 `displayMode` 初始化逻辑

- [ ] **Step 3: 写最小渲染实现**

把月份渲染改成：

```tsx
{isMobileSingleMonthLayout ? (
  <MonthCalendar month={currentMonth} ... />
) : (
  <>
    <MonthCalendar month={currentMonth} ... />
    <MonthCalendar month={nextMonth} ... />
  </>
)}
```

顶部导航补：
- `上个月`
- `下个月`

规则：
- 始终推动 `currentMonth`
- 第二个月自动由 `nextMonth = addMonths(currentMonth, 1)` 跟随

坚持 KISS：
- 不做两套月份状态
- 不把 `MonthCalendar` 再拆

- [ ] **Step 4: 跑移动端与桌面端测试**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-mobile-move-mode.spec.ts" "tests/dashboard-sections.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交实现**

```bash
git add src/components/CalendarView.tsx tests/calendar-mobile-move-mode.spec.ts tests/dashboard-sections.spec.ts
git commit -m "feat(calendar): 支持移动端单月视图"
```

### Task 4: 联合回归验证

**Files:**
- Modify: `src/components/CalendarView.tsx`
- Test: `tests/calendar-drag-adjustment-reason.spec.ts`
- Test: `tests/calendar-mobile-move-mode.spec.ts`
- Test: `tests/dashboard-sections.spec.ts`

- [ ] **Step 1: 跑联合 Playwright 验证**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" "tests/calendar-mobile-move-mode.spec.ts" "tests/dashboard-sections.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 2: 跑静态校验**

Run:

```bash
npm run lint
```

Expected: PASS

- [ ] **Step 3: 提交收尾**

```bash
git add src/components/CalendarView.tsx tests/calendar-mobile-move-mode.spec.ts tests/dashboard-sections.spec.ts
git commit -m "fix: 收敛移动端单月视图回归"
```

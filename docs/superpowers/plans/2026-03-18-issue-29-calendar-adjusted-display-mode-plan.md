# Issue #29 Calendar Adjusted Display Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让发生换班的月历日期也跟随全局头像/姓名显示模式切换，并优化移动端姓名模式下的可读性。

**Architecture:** 仅修改 `CalendarCell` 的换班渲染分支，不新增页面级状态，也不触碰拖拽、日志和数据结构。先用 Playwright 扩展换班场景的失败测试，再补最小展示实现，保证普通日期和换班日期都服从同一套 `displayMode` 规则。

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Playwright

---

## 文件结构

**Modify:**
- `src/components/CalendarCell.tsx`
- `tests/calendar-drag-adjustment-reason.spec.ts`
- `tests/calendar-mobile-move-mode.spec.ts`

**Why these files:**
- `CalendarCell.tsx` 是换班日期绕过 `displayMode` 的根源，也是本次唯一需要改业务展示逻辑的组件。
- `calendar-drag-adjustment-reason.spec.ts` 已经覆盖“发生换班”的真实路径，最适合补桌面端切换模式回归。
- `calendar-mobile-move-mode.spec.ts` 已有移动端月历交互和登录基线，适合补移动端姓名模式可读性断言。

## Chunk 1: 失败测试先行

### Task 1: 扩展桌面端换班后切换头像模式的失败测试

**Files:**
- Modify: `tests/calendar-drag-adjustment-reason.spec.ts`
- Modify: `src/components/CalendarCell.tsx`

- [ ] **Step 1: 在现有换班成功用例后补一个失败断言**

在 `tests/calendar-drag-adjustment-reason.spec.ts` 的换班成功用例里继续执行：

```ts
await page.getByRole('button', { name: '切换为头像' }).click();

const adjustedCell = page.locator('[data-calendar-date="2026-03-16"]');
await expect(adjustedCell).not.toContainText('原：');
await expect(adjustedCell).not.toContainText('现：');
await expect(adjustedCell.locator('[data-adjusted-display="avatar"]')).toBeVisible();
```

用一个新的 `data-*` 标记做稳定断言，不依赖脆弱的 DOM 结构或颜色样式。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，原因是换班日期当前仍固定渲染文本版 `原/现`，不会响应头像模式切换。

- [ ] **Step 3: 提交测试变更**

```bash
git add tests/calendar-drag-adjustment-reason.spec.ts
git commit -m "test: 补充换班日期头像模式回归"
```

### Task 2: 扩展移动端姓名模式可读性的失败测试

**Files:**
- Modify: `tests/calendar-mobile-move-mode.spec.ts`
- Modify: `src/components/CalendarCell.tsx`

- [ ] **Step 1: 为移动端换班场景补最小断言**

在 `tests/calendar-mobile-move-mode.spec.ts` 增加一条换班场景：

```ts
await page.setViewportSize({ width: 390, height: 844 });
await login(page);

// 通过已存在的测试数据制造一个换班后的日期
const adjustedCell = page.locator('[data-calendar-date="2026-03-16"]');
await expect(adjustedCell).toContainText('原：');
await expect(adjustedCell).toContainText('现：');
await expect(adjustedCell.locator('[data-adjusted-display="name"]')).toBeVisible();
```

断言重点放在：
- 仍然是姓名模式
- 存在专门的紧凑姓名布局标记

不要写像素级断言，也不要依赖具体截断长度。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-mobile-move-mode.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，原因是当前没有区分换班日期姓名模式的移动端紧凑布局标记。

- [ ] **Step 3: 提交测试变更**

```bash
git add tests/calendar-mobile-move-mode.spec.ts
git commit -m "test: 补充换班日期移动端姓名模式回归"
```

## Chunk 2: 最小实现

### Task 3: 让换班日期跟随 displayMode 切换

**Files:**
- Modify: `src/components/CalendarCell.tsx`
- Test: `tests/calendar-drag-adjustment-reason.spec.ts`

- [ ] **Step 1: 阅读现有换班渲染分支**

Run:

```bash
sed -n '1,220p' "src/components/CalendarCell.tsx"
```

Expected: 看到 `showOriginalAndCurrent` 直接返回固定两行文本块，绕过 `displayMode`。

- [ ] **Step 2: 写最小实现**

把 `showOriginalAndCurrent` 分支拆成：

```tsx
{showOriginalAndCurrent ? (
  displayMode === 'avatar' ? (
    <div data-adjusted-display="avatar">
      {/* 原/现两个紧凑头像块 */}
    </div>
  ) : (
    <div data-adjusted-display="name">
      {/* 原/现文本块 */}
    </div>
  )
) : ...}
```

实现规则：
- 头像模式只显示两个小头像块和短标签 `原` / `现`
- 姓名模式保留 `原：` / `现：`
- 普通未换班日期逻辑完全不动

坚持 KISS：不要抽离过度 helper，不要新增页面状态。

- [ ] **Step 3: 运行桌面端回归**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 4: 提交实现**

```bash
git add src/components/CalendarCell.tsx tests/calendar-drag-adjustment-reason.spec.ts
git commit -m "feat: 支持换班日期跟随显示模式切换"
```

### Task 4: 优化移动端姓名模式下的换班布局

**Files:**
- Modify: `src/components/CalendarCell.tsx`
- Test: `tests/calendar-mobile-move-mode.spec.ts`

- [ ] **Step 1: 写最小样式调整**

在 `CalendarCell.tsx` 的换班姓名模式里做最小收缩：

```tsx
<div
  data-adjusted-display="name"
  className="w-full space-y-1 px-1 text-[10px] leading-tight sm:px-2 sm:text-xs"
>
  <div className="truncate rounded bg-muted px-1 py-0.5 text-muted-foreground sm:px-1.5 sm:py-1">
    原：{...}
  </div>
  <div className="truncate rounded px-1 py-0.5 text-white sm:px-1.5 sm:py-1">
    现：{...}
  </div>
</div>
```

目标是：
- 移动端减少内边距和垂直占用
- 保留 `truncate`
- 桌面端视觉维持现有层级

- [ ] **Step 2: 运行移动端回归**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-mobile-move-mode.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 3: 做一次联合验证**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-drag-adjustment-reason.spec.ts" "tests/calendar-mobile-move-mode.spec.ts" "tests/dashboard-sections.spec.ts" --reporter=line --workers=1
npm run lint
```

Expected:
- 所有 Playwright 用例 PASS
- `npm run lint` PASS

- [ ] **Step 4: 提交收尾**

```bash
git add src/components/CalendarCell.tsx tests/calendar-mobile-move-mode.spec.ts tests/calendar-drag-adjustment-reason.spec.ts
git commit -m "fix: 优化换班日期移动端展示"
```

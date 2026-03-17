# 月历视图桌面端默认显示姓名 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让排班月历视图在桌面端首次进入时默认显示姓名，在移动端保持默认头像，并保留现有手动切换能力。

**Architecture:** 在 `CalendarView` 中继续维护单一的 `displayMode` 状态，新增一个仅用于首次挂载的默认模式修正逻辑。使用客户端断点判断桌面端初始模式，且只在用户尚未手动切换时修正默认值，避免覆盖用户操作。

**Tech Stack:** Next.js, React Client Components, Playwright, ESLint

---

## Chunk 1: 默认显示模式逻辑

### Task 1: 调整 `CalendarView` 默认模式初始化

**Files:**
- Modify: `src/components/CalendarView.tsx`
- Test: `tests/dashboard-sections.spec.ts`
- Test: `tests/calendar-mobile-move-mode.spec.ts`

- [ ] **Step 1: 写出桌面端默认姓名的失败用例**

在 `tests/dashboard-sections.spec.ts` 增加断言：桌面登录进入首页后，月历模式切换按钮默认显示“切换为头像”。

- [ ] **Step 2: 运行定向测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/dashboard-sections.spec.ts" --reporter=line --workers=1`
Expected: FAIL，按钮当前仍显示“切换为姓名”。

- [ ] **Step 3: 写最小实现**

在 `src/components/CalendarView.tsx`：
- 保持 `displayMode` 为单一状态源。
- 增加“用户是否已手动切换”的 `ref`。
- 初始值保持 `avatar`，避免首帧不一致。
- 在 `useEffect` 中通过 `window.matchMedia('(min-width: 640px)')` 判断桌面端。
- 仅当用户尚未手动切换时，把桌面端初始模式修正为 `name`。
- 切换按钮点击时标记用户已手动切换。

- [ ] **Step 4: 补移动端守护断言**

在 `tests/calendar-mobile-move-mode.spec.ts` 增加断言：移动视口默认按钮文案仍为“切换为姓名”。

- [ ] **Step 5: 运行相关测试确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/dashboard-sections.spec.ts" "tests/calendar-mobile-move-mode.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 6: 运行 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/components/CalendarView.tsx tests/dashboard-sections.spec.ts tests/calendar-mobile-move-mode.spec.ts
git commit -m "feat: 调整月历默认显示模式"
```

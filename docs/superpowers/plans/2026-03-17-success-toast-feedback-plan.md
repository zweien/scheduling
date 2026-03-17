# 成功操作统一提醒实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为系统内所有写操作的成功路径补充统一 toast 提醒，并保持失败反馈语义不变。

**Architecture:** 复用现有 `sonner` 全局 `Toaster`，在客户端组件的成功分支统一调用 `toast.success(...)`。对明显重复的数量型或摘要型文案提取最小 helper，其余固定文案直接保留在组件内，避免过度抽象。

**Tech Stack:** Next.js App Router、React Client Components、TypeScript、sonner、Playwright、Node test

---

## 文件结构

- Create: `src/lib/ui/success-toast.ts`
  - 承载少量重复成功文案生成函数
- Modify: `src/components/CalendarView.tsx`
  - 排班相关成功提醒
- Modify: `src/components/ScheduleGenerator.tsx`
  - 生成排班成功提醒
- Modify: `src/components/ScheduleImportDialog.tsx`
  - 导入排班成功提醒
- Modify: `src/components/DutyUserManagement.tsx`
  - 值班人员相关成功提醒
- Modify: `src/components/AccountManagement.tsx`
  - 账号创建、角色调整、启停成功提醒
- Modify: `src/components/PasswordDialog.tsx`
  - 修改密码成功提醒
- Modify: `src/components/RegistrationSettings.tsx`
  - 注册开关成功提醒
- Modify: `src/components/LoginForm.tsx`
  - 登录成功提醒
- Modify: `src/components/RegisterForm.tsx`
  - 注册成功提醒
- Test: `tests/success-toast.test.mjs`
  - 校验 helper 文案输出
- Modify: `tests/duty-users-management.spec.ts`
  - 验证值班人员成功 toast
- Modify: `tests/login-page.spec.ts`
  - 验证登录成功 toast
- Modify: `tests/account-permissions.spec.ts`
  - 验证注册开关更新成功 toast

## Chunk 1: 最小文案抽象

### Task 1: 先写 helper 失败测试

**Files:**
- Create: `tests/success-toast.test.mjs`
- Create: `src/lib/ui/success-toast.ts`

- [ ] **Step 1: 写失败测试，覆盖数量型和摘要型文案**

```js
import test from 'node:test';
import assert from 'node:assert/strict';

test('formats deleted duty user count', async () => {
  const { getDeleteDutyUsersSuccessMessage } = await loadModule();
  assert.equal(getDeleteDutyUsersSuccessMessage(3), '已删除 3 名值班人员');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/success-toast.test.mjs"`
Expected: FAIL，提示缺少 helper

- [ ] **Step 3: 实现最小 helper**

要求：

- 删除值班人员数量文案
- 批量删除排班数量文案
- 导入值班人员摘要文案
- 导入排班摘要文案

- [ ] **Step 4: 再次运行测试确认通过**

Run: `node --test "tests/success-toast.test.mjs"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/lib/ui/success-toast.ts tests/success-toast.test.mjs
git commit -m "feat: add success toast message helpers"
```

## Chunk 2: 核心成功路径接入

### Task 2: 接入认证与设置成功提醒

**Files:**
- Modify: `src/components/LoginForm.tsx`
- Modify: `src/components/RegisterForm.tsx`
- Modify: `src/components/PasswordDialog.tsx`
- Modify: `src/components/RegistrationSettings.tsx`

- [ ] **Step 1: 在成功分支接入 `toast.success`**

要求：

- 登录成功
- 注册成功
- 修改密码成功
- 注册开关更新成功

- [ ] **Step 2: 保持错误分支行为不变**

要求：

- 不能把错误提示改成成功提示
- 现有错误文案继续可见

- [ ] **Step 3: 运行相关页面回归**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3004" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/login-page.spec.ts" "tests/account-permissions.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/components/LoginForm.tsx src/components/RegisterForm.tsx src/components/PasswordDialog.tsx src/components/RegistrationSettings.tsx tests/login-page.spec.ts tests/account-permissions.spec.ts
git commit -m "feat: add success toasts for auth and settings"
```

### Task 3: 接入值班人员相关成功提醒

**Files:**
- Modify: `src/components/DutyUserManagement.tsx`
- Modify: `tests/duty-users-management.spec.ts`

- [ ] **Step 1: 在值班人员成功分支补 toast**

覆盖：

- 新增
- 编辑
- 删除单人
- 批量删除
- 启用 / 停用
- 调整顺序
- 导入

- [ ] **Step 2: 对数量型和导入摘要文案复用 helper**

- [ ] **Step 3: 运行值班人员回归**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3004" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/duty-users-management.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/components/DutyUserManagement.tsx tests/duty-users-management.spec.ts
git commit -m "feat: add success toasts for duty user actions"
```

## Chunk 3: 排班与账号成功路径接入

### Task 4: 接入排班相关成功提醒

**Files:**
- Modify: `src/components/CalendarView.tsx`
- Modify: `src/components/ScheduleGenerator.tsx`
- Modify: `src/components/ScheduleImportDialog.tsx`

- [ ] **Step 1: 在成功分支补 toast**

覆盖：

- 生成排班
- 替换排班
- 删除排班
- 批量删除排班
- 交换排班
- 移动排班
- 导入排班

- [ ] **Step 2: 导入和批量删除文案复用 helper**

- [ ] **Step 3: 运行代表性回归**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3004" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-delete-schedule.spec.ts" "tests/calendar-batch-delete.spec.ts" "tests/schedule-import.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/components/CalendarView.tsx src/components/ScheduleGenerator.tsx src/components/ScheduleImportDialog.tsx
git commit -m "feat: add success toasts for schedule actions"
```

### Task 5: 接入账号管理成功提醒

**Files:**
- Modify: `src/components/AccountManagement.tsx`

- [ ] **Step 1: 在账号创建、角色调整、启停成功分支补 toast**

- [ ] **Step 2: 运行账号相关回归**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3004" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/account-permissions.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/components/AccountManagement.tsx
git commit -m "feat: add success toasts for account actions"
```

## Chunk 4: 最终验证与交付

### Task 6: 完整验证

**Files:**
- Verify: `src/lib/ui/success-toast.ts`
- Verify: `src/components/LoginForm.tsx`
- Verify: `src/components/RegisterForm.tsx`
- Verify: `src/components/PasswordDialog.tsx`
- Verify: `src/components/RegistrationSettings.tsx`
- Verify: `src/components/DutyUserManagement.tsx`
- Verify: `src/components/CalendarView.tsx`
- Verify: `src/components/ScheduleGenerator.tsx`
- Verify: `src/components/ScheduleImportDialog.tsx`
- Verify: `src/components/AccountManagement.tsx`
- Verify: `tests/success-toast.test.mjs`

- [ ] **Step 1: 运行 helper 测试**

Run: `node --test "tests/success-toast.test.mjs"`
Expected: PASS

- [ ] **Step 2: 运行关键页面回归**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3004" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/login-page.spec.ts" "tests/account-permissions.spec.ts" "tests/duty-users-management.spec.ts" "tests/calendar-batch-delete.spec.ts" "tests/calendar-delete-schedule.spec.ts" "tests/schedule-import.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 3: 运行 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: 生成最终提交**

```bash
git add src/lib/ui/success-toast.ts src/components/LoginForm.tsx src/components/RegisterForm.tsx src/components/PasswordDialog.tsx src/components/RegistrationSettings.tsx src/components/DutyUserManagement.tsx src/components/CalendarView.tsx src/components/ScheduleGenerator.tsx src/components/ScheduleImportDialog.tsx src/components/AccountManagement.tsx tests/success-toast.test.mjs tests/login-page.spec.ts tests/account-permissions.spec.ts tests/duty-users-management.spec.ts
git commit -m "feat: show success toasts for write actions"
```

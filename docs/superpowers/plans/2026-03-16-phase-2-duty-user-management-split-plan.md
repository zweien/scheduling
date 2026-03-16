# Phase 2 Duty User Management Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变用户可见行为的前提下，拆分值班人员管理模块的组件与 Server Action 边界。

**Architecture:** 保留 `DutyUserManagement` 作为薄容器，抽离筛选、导入、表单、列表四个子组件；同时将 `users` actions 拆成只读、写入、导入三个文件。底层 `lib/users.ts` 暂不调整，避免阶段 2 过度扩张。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Server Actions、Playwright、ESLint

---

## Chunk 1: 组件拆分

### Task 1: 抽离值班人员筛选组件

**Files:**
- Create: `src/components/duty-users/DutyUserFilters.tsx`
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/duty-users-management.spec.ts`

- [ ] Step 1: 将筛选区 JSX 和筛选 props 定义迁移到 `DutyUserFilters.tsx`
- [ ] Step 2: 在 `DutyUserManagement.tsx` 中接入新组件，保持现有筛选行为和文案不变
- [ ] Step 3: 运行 `npm run lint -- "src/components/DutyUserManagement.tsx" "src/components/duty-users/DutyUserFilters.tsx"`
- [ ] Step 4: 运行 `npx playwright test "tests/duty-users-management.spec.ts" --reporter=line --workers=1`
- [ ] Step 5: 提交本任务改动

### Task 2: 抽离导入和表单组件

**Files:**
- Create: `src/components/duty-users/DutyUserImportPanel.tsx`
- Create: `src/components/duty-users/DutyUserForm.tsx`
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/duty-users-import.spec.ts`

- [ ] Step 1: 提取导入面板为 `DutyUserImportPanel.tsx`
- [ ] Step 2: 提取新增/编辑表单为 `DutyUserForm.tsx`
- [ ] Step 3: 保留 `canManage` 行为，不改变管理员/普通用户可见性
- [ ] Step 4: 运行 `npm run lint -- "src/components/DutyUserManagement.tsx" "src/components/duty-users/DutyUserImportPanel.tsx" "src/components/duty-users/DutyUserForm.tsx"`
- [ ] Step 5: 运行 `npx playwright test "tests/duty-users-import.spec.ts" --reporter=line --workers=1`
- [ ] Step 6: 提交本任务改动

### Task 3: 抽离列表组件

**Files:**
- Create: `src/components/duty-users/DutyUserList.tsx`
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/account-permissions.spec.ts`

- [ ] Step 1: 提取人员列表与操作按钮区域到 `DutyUserList.tsx`
- [ ] Step 2: 确保普通用户只读视图保持不变
- [ ] Step 3: 运行 `npm run lint -- "src/components/DutyUserManagement.tsx" "src/components/duty-users/DutyUserList.tsx"`
- [ ] Step 4: 运行 `npx playwright test "tests/account-permissions.spec.ts" --reporter=line --workers=1`
- [ ] Step 5: 提交本任务改动

## Chunk 2: Action 拆分

### Task 4: 拆分只读、写入、导入 actions

**Files:**
- Create: `src/app/actions/users-read.ts`
- Create: `src/app/actions/users-write.ts`
- Create: `src/app/actions/users-import.ts`
- Modify: `src/app/actions/users.ts`
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/duty-users-management.spec.ts`
- Test: `tests/duty-users-import.spec.ts`
- Test: `tests/account-permissions.spec.ts`

- [ ] Step 1: 将查询 action 移到 `users-read.ts`
- [ ] Step 2: 将维护 action 移到 `users-write.ts`
- [ ] Step 3: 将模板/导入 action 移到 `users-import.ts`
- [ ] Step 4: 将 `src/app/actions/users.ts` 收缩为兼容导出层，避免一次性改爆 import 面
- [ ] Step 5: 更新组件 import 路径
- [ ] Step 6: 运行 `npm run lint`
- [ ] Step 7: 运行 `npx playwright test "tests/duty-users-management.spec.ts" "tests/duty-users-import.spec.ts" "tests/account-permissions.spec.ts" --reporter=line --workers=1`
- [ ] Step 8: 提交本任务改动

## Chunk 3: 整体验证

### Task 5: 阶段 2 整体验证与收尾

**Files:**
- Verify: `src/components/DutyUserManagement.tsx`
- Verify: `src/components/duty-users/*.tsx`
- Verify: `src/app/actions/users*.ts`

- [ ] Step 1: 运行 `npm run lint`
- [ ] Step 2: 运行 `npx playwright test "tests/duty-users-management.spec.ts" "tests/duty-users-import.spec.ts" "tests/account-permissions.spec.ts" "tests/dashboard-sections.spec.ts" --reporter=line --workers=1`
- [ ] Step 3: 检查 `git diff --stat`，确认没有非本阶段改动混入
- [ ] Step 4: 使用 Conventional Commits 提交阶段 2 改动

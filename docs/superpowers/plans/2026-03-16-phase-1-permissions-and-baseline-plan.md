# 阶段 1：权限与工程基线 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正值班人员页的只读权限错层，清理全量 lint 阻塞项，并补齐关键权限回归。

**Architecture:** 这一阶段只收敛“行为一致性”和“工程基线”，不做结构性重构。页面、action、lint 规则和测试按最小改动收口，确保后续阶段在稳定基线上推进。

**Tech Stack:** Next.js、TypeScript、ESLint、Playwright、SQLite

---

## 文件结构

**Likely Modify:**
- `src/app/actions/users.ts`
- `src/app/dashboard/users/page.tsx`
- `src/components/DutyUserManagement.tsx`
- `src/components/ThemeProvider.tsx`
- `tests/account-permissions.spec.ts`
- `tests/duty-users-management.spec.ts`

## Chunk 1: 权限一致性

### Task 1: 修正值班人员页读取权限

**Files:**
- Modify: `src/app/actions/users.ts`
- Modify: `src/app/dashboard/users/page.tsx`
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/account-permissions.spec.ts`

- [ ] **Step 1: 先写或补失败回归**

目标：
- 普通用户可访问 `/dashboard/users`
- 普通用户可看到列表和筛选
- 普通用户不能执行新增、编辑、删除、导入

- [ ] **Step 2: 拆分只读查询与管理员查询**

建议最小实现：
- 新增只读查询 action，例如 `getDutyUsersForView`
- 管理员维护 action 保持 `requireAdmin()`

- [ ] **Step 3: 组件只读模式继续保留**

确保：
- 普通用户只走只读查询
- 管理员继续使用完整能力

- [ ] **Step 4: 跑权限回归**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_USERNAME=admin PLAYWRIGHT_PASSWORD=idrl123456 npx playwright test "tests/account-permissions.spec.ts" "tests/duty-users-management.spec.ts" --reporter=line --workers=1
```

Expected: PASS

## Chunk 2: 工程基线

### Task 2: 清理全量 lint 阻塞项

**Files:**
- Modify: `src/components/ThemeProvider.tsx`
- Possibly modify other currently blocking files found by `npm run lint`

- [ ] **Step 1: 运行全量 lint 并锁定阻塞项**

Run:

```bash
npm run lint
```

Expected: 列出当前阻塞文件

- [ ] **Step 2: 逐个修复阻塞项**

当前已知至少包含：
- `src/components/ThemeProvider.tsx`

- [ ] **Step 3: 重新运行全量 lint**

Run:

```bash
npm run lint
```

Expected: PASS

## Chunk 3: 关键流程回归

### Task 3: 执行一轮关键浏览器回归

**Files:**
- Test: `tests/login-page.spec.ts`
- Test: `tests/dashboard-sections.spec.ts`
- Test: `tests/duty-users-management.spec.ts`
- Test: `tests/account-permissions.spec.ts`

- [ ] **Step 1: 运行关键回归**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_USERNAME=admin PLAYWRIGHT_PASSWORD=idrl123456 npx playwright test "tests/login-page.spec.ts" "tests/dashboard-sections.spec.ts" "tests/duty-users-management.spec.ts" "tests/account-permissions.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 2: 记录剩余风险**

明确记录：
- 本阶段未处理的结构性问题
- 下一阶段要处理的组件拆分点

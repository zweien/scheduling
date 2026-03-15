# 日志审计增强 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有日志系统补充操作用户、IP、来源、筛选搜索和导出能力，并覆盖 Web 与 API 写操作。

**Architecture:** 在现有 `logs` 表上增量迁移新字段，不引入第二套审计表。日志写入统一收口到 `src/lib/logs.ts`，由 Web Server Action 和 API Route 通过不同上下文入口写入。日志页改造成基于条件查询的审计列表，并支持导出当前筛选结果。

**Tech Stack:** Next.js App Router, React 19, TypeScript, better-sqlite3, Playwright

---

## Chunk 1: 日志模型与测试

### Task 1: 为日志增强补测试

**Files:**
- Create: `tests/log-audit.spec.ts`
- Modify: `tests/api-tokens.spec.ts`

- [ ] 写失败测试，覆盖 Web 日志字段、API 日志字段、日志页面筛选/搜索、CSV/JSON 导出
- [ ] 运行新增测试并确认按预期失败

## Chunk 2: 日志采集与查询

### Task 2: 扩展日志数据模型

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/logs.ts`

- [ ] 为 `logs` 表增加 `operator_username`、`operator_role`、`ip_address`、`source`
- [ ] 新增日志查询过滤与导出数据构建逻辑
- [ ] 保持旧日志兼容

### Task 3: 收口 Web / API 日志入口

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/actions/users.ts`
- Modify: `src/app/actions/schedule.ts`
- Modify: `src/app/actions/config.ts`
- Modify: `src/app/actions/accounts.ts`
- Modify: `src/app/api/schedules/[date]/route.ts`
- Modify: `src/app/api/tokens/route.ts`
- Modify: `src/app/api/tokens/[id]/route.ts`
- Modify: `src/lib/api-auth.ts`

- [ ] 用统一日志上下文替换散落的 `addLog`
- [ ] 记录 Web 操作账号和来源
- [ ] 记录 API 操作 token 身份、IP 和来源

## Chunk 3: 日志页与导出

### Task 4: 重构日志页

**Files:**
- Modify: `src/app/actions/logs.ts`
- Modify: `src/components/LogDialog.tsx`
- Modify: `src/app/dashboard/logs/page.tsx`

- [ ] 添加筛选、搜索和导出交互
- [ ] 列表展示扩展字段
- [ ] 导出当前筛选结果为 CSV / JSON

## Chunk 4: 验证

### Task 5: 运行验证

**Files:**
- Test: `tests/log-audit.spec.ts`
- Test: `tests/api-tokens.spec.ts`

- [ ] 运行 ESLint
- [ ] 运行日志相关 Playwright 测试
- [ ] 运行受影响回归测试并确认全绿

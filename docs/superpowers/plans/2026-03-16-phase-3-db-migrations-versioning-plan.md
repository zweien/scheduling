# Phase 3 DB Migrations Versioning Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SQLite 数据库引入最小可用的版本化 migration 机制，并将 seed 初始化从 `db.ts` 中剥离。

**Architecture:** 保留 `db.ts` 作为连接入口，新增 migration runner 与 seed 模块。通过 `schema_migrations` 记录版本，按顺序执行 migration，然后执行幂等 seed。现有表结构和业务行为保持不变。

**Tech Stack:** Node.js、TypeScript、better-sqlite3、Next.js、Playwright、ESLint

---

## Chunk 1: 迁移基础设施

### Task 1: 引入 migration runner

**Files:**
- Create: `src/lib/db/migrations.ts`
- Modify: `src/lib/db.ts`
- Test: `tests/db-migrations.test.mjs`

- [ ] Step 1: 写一个最小 failing test，验证会创建 `schema_migrations` 表并记录已执行版本
- [ ] Step 2: 运行该测试，确认在旧结构下失败
- [ ] Step 3: 实现 migration runner 和基础 migration 列表
- [ ] Step 4: 再跑测试确认通过
- [ ] Step 5: 提交本任务改动

### Task 2: 将历史隐式迁移转为显式版本 migration

**Files:**
- Modify: `src/lib/db/migrations.ts`
- Modify: `src/lib/db.ts`
- Test: `tests/db-migrations.test.mjs`

- [ ] Step 1: 将 users/accounts/logs 的增字段逻辑迁移到版本化 migration 中
- [ ] Step 2: 删除 `db.ts` 中对应的 `ALTER TABLE ... try/catch`
- [ ] Step 3: 补测试，覆盖已有数据库重复启动不重复迁移
- [ ] Step 4: 运行测试确认通过
- [ ] Step 5: 提交本任务改动

## Chunk 2: Seed 拆分

### Task 3: 提取配置与默认管理员 seed

**Files:**
- Create: `src/lib/db/seed.ts`
- Modify: `src/lib/db.ts`
- Test: `tests/db-migrations.test.mjs`

- [ ] Step 1: 将默认配置和管理员初始化迁移到 `seed.ts`
- [ ] Step 2: 保持默认管理员幂等创建
- [ ] Step 3: 补测试覆盖 `password`、`registration_enabled` 和默认管理员 seed
- [ ] Step 4: 运行测试确认通过
- [ ] Step 5: 提交本任务改动

## Chunk 3: 整体验证

### Task 4: 主流程验证

**Files:**
- Verify: `src/lib/db.ts`
- Verify: `src/lib/db/migrations.ts`
- Verify: `src/lib/db/seed.ts`
- Test: `tests/db-migrations.test.mjs`
- Test: `tests/login-page.spec.ts`
- Test: `tests/duty-users-management.spec.ts`
- Test: `tests/duty-users-import.spec.ts`

- [ ] Step 1: 运行 `npm run lint`
- [ ] Step 2: 运行 `SESSION_SECRET=test_secret_for_build_validation_123456789 S_PORT=3018 npm run build`
- [ ] Step 3: 运行 `node --test "tests/db-migrations.test.mjs"`
- [ ] Step 4: 启动本地服务并运行 `npx playwright test "tests/login-page.spec.ts" "tests/duty-users-management.spec.ts" "tests/duty-users-import.spec.ts" --reporter=line --workers=1`
- [ ] Step 5: 检查 `git diff --stat`，确认没有混入非本阶段改动
- [ ] Step 6: 使用 Conventional Commits 提交阶段 3 改动

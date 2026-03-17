# 外部 API 按角色区分查询与修改能力 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 API Token 绑定账号并按账号角色控制外部 API 读写权限，同时允许普通用户管理自己的只读 Token。

**Architecture:** 通过数据库迁移给 `api_tokens` 增加 `account_id`，把 API 鉴权从“仅校验 token”升级为“token + 账号上下文”。查询接口只要求认证成功，写接口额外要求管理员角色；Token 管理接口改为登录用户只能操作自己的 Token。

**Tech Stack:** Next.js Route Handlers, better-sqlite3, Playwright, Node test, ESLint

---

## Chunk 1: 数据模型与鉴权上下文

### Task 1: 扩展 `api_tokens` 数据结构

**Files:**
- Modify: `src/lib/db/migrations.ts`
- Modify: `src/types.ts`
- Test: `tests/db-migrations.test.mjs`

- [ ] **Step 1: 写失败测试**

在 `tests/db-migrations.test.mjs` 中为 `api_tokens` 表增加 `account_id` 断言。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/db-migrations.test.mjs"`
Expected: FAIL，缺少 `account_id`。

- [ ] **Step 3: 写最小迁移实现**

在 `src/lib/db/migrations.ts` 中为 `api_tokens` 增加 `account_id INTEGER` 字段，并保证老库升级时补列。

- [ ] **Step 4: 更新类型定义**

在 `src/types.ts` 增加 API Token 对应的账号归属字段类型。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test "tests/db-migrations.test.mjs"`
Expected: PASS

### Task 2: 升级 API 鉴权上下文

**Files:**
- Modify: `src/lib/api-tokens.ts`
- Modify: `src/lib/api-auth.ts`
- Test: `tests/api-tokens.spec.ts`

- [ ] **Step 1: 写失败测试**

增加用例验证：创建 token 时会绑定当前账号，列出 token 时只返回当前账号自己的 token。

- [ ] **Step 2: 运行定向测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-tokens.spec.ts" --reporter=line --workers=1`
Expected: FAIL，当前 token 无账号归属且列表未隔离。

- [ ] **Step 3: 写最小实现**

在 `src/lib/api-tokens.ts` 中：
- 创建 token 时写入 `account_id`
- 列表查询按 `account_id` 过滤
- 禁用 token 时按 `id + account_id` 查找
- 验证 token 时返回 token 及关联账号信息；旧 token 缺少 `account_id` 时兼容为管理员历史 token

在 `src/lib/api-auth.ts` 中：
- 返回统一的 API 认证上下文
- 提供写权限判断工具

- [ ] **Step 4: 运行定向测试确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-tokens.spec.ts" --reporter=line --workers=1`
Expected: PASS

---

## Chunk 2: 路由权限与行为回归

### Task 3: 收紧写接口到管理员 Token

**Files:**
- Modify: `src/app/api/schedules/[date]/route.ts`
- Test: `tests/api-schedules.spec.ts`
- Test: `tests/log-audit.spec.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/api-schedules.spec.ts` 增加普通用户 token 调用 `PATCH /api/schedules/[date]` 返回 `403` 的断言，并保留管理员 token 可写。

- [ ] **Step 2: 运行测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-schedules.spec.ts" --reporter=line --workers=1`
Expected: FAIL，普通用户 token 目前仍可写。

- [ ] **Step 3: 写最小实现**

在 `src/app/api/schedules/[date]/route.ts` 使用新的 API 认证上下文，对写操作追加管理员校验，权限不足时返回 `403 FORBIDDEN`。

- [ ] **Step 4: 补日志守护**

在 `tests/log-audit.spec.ts` 中区分管理员写成功与普通用户写失败，不允许失败写操作产生成功日志。

- [ ] **Step 5: 运行测试确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-schedules.spec.ts" "tests/log-audit.spec.ts" --reporter=line --workers=1`
Expected: PASS

### Task 4: 放开并隔离 Token 管理接口

**Files:**
- Modify: `src/app/api/tokens/route.ts`
- Modify: `src/app/api/tokens/[id]/route.ts`
- Test: `tests/api-tokens.spec.ts`

- [ ] **Step 1: 写失败测试**

补充普通用户登录会话下：
- 可以创建 token
- 可以列出自己的 token
- 不能禁用其他账号 token

- [ ] **Step 2: 运行测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-tokens.spec.ts" --reporter=line --workers=1`
Expected: FAIL，当前接口要求管理员角色。

- [ ] **Step 3: 写最小实现**

在 Token 管理路由中：
- 去掉管理员硬限制，改为登录即可
- 创建 token 时绑定当前账号
- 列表只返回当前账号 token
- 禁用只允许命中当前账号 token，否则返回 `404`

- [ ] **Step 4: 运行测试确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-tokens.spec.ts" --reporter=line --workers=1`
Expected: PASS

---

## Chunk 3: 整体验证与提交

### Task 5: 运行完整验证并提交

**Files:**
- Modify: `tests/api-schedules.spec.ts`
- Modify: `tests/api-tokens.spec.ts`
- Modify: `tests/log-audit.spec.ts`
- Modify: `tests/db-migrations.test.mjs`
- Modify: `src/lib/api-auth.ts`
- Modify: `src/lib/api-tokens.ts`
- Modify: `src/app/api/schedules/[date]/route.ts`
- Modify: `src/app/api/tokens/route.ts`
- Modify: `src/app/api/tokens/[id]/route.ts`
- Modify: `src/lib/db/migrations.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: 运行 Node 测试**

Run: `node --test "tests/db-migrations.test.mjs"`
Expected: PASS

- [ ] **Step 2: 运行 API 相关 Playwright 回归**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/api-tokens.spec.ts" "tests/api-schedules.spec.ts" "tests/log-audit.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 3: 运行 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/lib/db/migrations.ts src/types.ts src/lib/api-tokens.ts src/lib/api-auth.ts src/app/api/schedules/[date]/route.ts src/app/api/tokens/route.ts src/app/api/tokens/[id]/route.ts tests/db-migrations.test.mjs tests/api-tokens.spec.ts tests/api-schedules.spec.ts tests/log-audit.spec.ts
git commit -m "feat: 按角色限制外部 API 写权限"
```

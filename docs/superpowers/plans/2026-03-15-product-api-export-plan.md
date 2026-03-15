# 值班排班系统产品化升级 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 README 产品化重构、登录页专业化升级、带 Bearer Token 的 REST API，以及月历风格 XLSX 导出。

**Architecture:** 保持单仓库增量扩展。UI、API、导出共用 `src/lib` 的领域逻辑，`route.ts` 只负责参数校验与响应封装，XLSX 工作簿生成独立封装，README 与截图作为独立展示层维护。

**Tech Stack:** Next.js App Router, React 19, TypeScript, SQLite, better-sqlite3, iron-session, Playwright, openpyxl or equivalent XLSX writer

---

## 文件结构映射

**文档与展示**

- Modify: `README.md`
- Reuse: `docs/screenshots/*`

**登录页**

- Modify: `src/components/LoginForm.tsx`
- Optional Create: `src/components/LoginHero.tsx`
- Optional Create: `src/components/LoginFeatureList.tsx`

**API 与 Token**

- Modify: `src/lib/db.ts`
- Create: `src/lib/api-tokens.ts`
- Create: `src/lib/api-auth.ts`
- Create: `src/lib/api-errors.ts`
- Create: `src/app/api/schedules/route.ts`
- Create: `src/app/api/schedules/[date]/route.ts`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/tokens/route.ts`
- Create: `src/app/api/tokens/[id]/route.ts`
- Optional Modify: `src/lib/schedules.ts`
- Optional Modify: `src/lib/users.ts`

**导出**

- Modify: `src/app/actions/export.ts`
- Modify: `src/components/ExportDialog.tsx`
- Create: `src/lib/export/calendar-xlsx.ts`

**测试**

- Create: `tests/api-schedules.spec.ts`
- Create: `tests/api-tokens.spec.ts`
- Create: `tests/export-xlsx.spec.ts`
- Modify: `tests/statistics-navigation.spec.ts` only if shared helpers become necessary

## Chunk 1: README 与登录页升级

### Task 1: 重写 README 为产品化 GitHub 首页

**Files:**
- Modify: `README.md`
- Reuse: `docs/screenshots/01-login-page.png`
- Reuse: `docs/screenshots/02-dashboard-empty.png`
- Reuse: `docs/screenshots/07-calendar-with-schedule.png`
- Reuse: `docs/screenshots/08-statistics-dialog.png`
- Reuse: `mobile-view.png`

- [ ] **Step 1: 盘点可用截图与现有 README 结构**

Run:

```bash
rg --files "docs/screenshots" "." | sort
sed -n '1,260p' README.md
```

Expected: 明确可引用截图列表与 README 现有章节。

- [ ] **Step 2: 编写新的 README 结构草稿**

Include sections:

```md
# Hero
# Highlights
# Screenshots
# Quick Start
# Usage Flow
# REST API Preview
# Export Options
# Tech Stack
# Roadmap
# License
```

- [ ] **Step 3: 使用真实截图与真实能力重写 README**

Requirements:
- 保持中文简体
- 使用真实路径引用图片
- 不夸大不存在的能力
- 将“默认密码”改为与实际系统策略一致的说明，避免硬编码错误文案

- [ ] **Step 4: 手工检查 Markdown 链接和图片路径**

Run:

```bash
rg -n "!\[|\[.*\]\(" README.md
```

Expected: 没有明显错误路径或空链接。

- [ ] **Step 5: 提交**

```bash
git add README.md
git commit -m "docs: refresh README with product-style presentation"
```

### Task 2: 升级登录页视觉表现

**Files:**
- Modify: `src/components/LoginForm.tsx`
- Optional Create: `src/components/LoginHero.tsx`

- [ ] **Step 1: 写登录页交互回归测试或补充现有浏览器测试**

Test behavior:

```ts
test('登录页展示品牌信息并支持错误提示', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('值班排班系统')).toBeVisible();
});
```

- [ ] **Step 2: 运行测试，确认当前视觉文案基线**

Run:

```bash
npx playwright test tests/statistics-navigation.spec.ts --reporter=line --workers=1
```

Expected: 现有导航测试仍通过，为后续 UI 改动提供基线。

- [ ] **Step 3: 实现专业化登录页布局**

Requirements:
- 保持现有 `login` Server Action 提交流程
- 提升标题、副标题、卖点展示、卡片样式
- 强化错误态与 loading 态
- 桌面与移动端都可用

- [ ] **Step 4: 运行回归测试并手工检查首页渲染**

Run:

```bash
npx playwright test tests/statistics-navigation.spec.ts --reporter=line --workers=1
```

Expected: 通过；登录页未影响后续登录流程。

- [ ] **Step 5: 提交**

```bash
git add src/components/LoginForm.tsx src/components/LoginHero.tsx
git commit -m "feat(ui): polish login page presentation"
```

## Chunk 2: REST API 与 Token 安全

### Task 3: 为 API Token 建立持久化模型

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/lib/api-tokens.ts`

- [ ] **Step 1: 写 token 领域层测试**

Test cases:

```ts
it('creates token metadata and stores only hash')
it('marks token disabled without deleting history')
it('updates last_used_at on successful authentication')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/api-tokens.spec.ts --reporter=line --workers=1
```

Expected: 因缺少 token 表或领域逻辑而失败。

- [ ] **Step 3: 在数据库初始化中增加 `api_tokens` 表**

Columns:
- `id`
- `name`
- `token_hash`
- `token_prefix`
- `created_at`
- `last_used_at`
- `disabled_at`

- [ ] **Step 4: 实现 token 创建、查询、禁用、哈希校验逻辑**

Requirements:
- 明文 token 仅创建时返回
- 服务端只保存 hash
- 支持 prefix 展示

- [ ] **Step 5: 运行 token 测试**

Run:

```bash
npx playwright test tests/api-tokens.spec.ts --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add src/lib/db.ts src/lib/api-tokens.ts tests/api-tokens.spec.ts
git commit -m "feat(api): add persistent API token management"
```

### Task 4: 建立 API 鉴权与错误响应基础设施

**Files:**
- Create: `src/lib/api-auth.ts`
- Create: `src/lib/api-errors.ts`

- [ ] **Step 1: 写 API 鉴权失败测试**

Test cases:

```ts
it('returns 401 when authorization header is missing')
it('returns 401 when token is invalid')
it('returns 401 when token is disabled')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/api-schedules.spec.ts --grep "401" --reporter=line --workers=1
```

Expected: 因缺少鉴权层而失败。

- [ ] **Step 3: 实现 Bearer Token 解析与统一错误响应**

Requirements:
- 从 `Authorization` 头提取 token
- 失败时统一返回 `{ error: { code, message } }`
- 成功时返回 token 元数据供 route 使用

- [ ] **Step 4: 重跑失败用例**

Run:

```bash
npx playwright test tests/api-schedules.spec.ts --grep "401" --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 5: 提交**

```bash
git add src/lib/api-auth.ts src/lib/api-errors.ts tests/api-schedules.spec.ts
git commit -m "feat(api): add bearer token authentication helpers"
```

### Task 5: 实现排班与人员 REST API

**Files:**
- Create: `src/app/api/schedules/route.ts`
- Create: `src/app/api/schedules/[date]/route.ts`
- Create: `src/app/api/users/route.ts`
- Optional Modify: `src/lib/schedules.ts`
- Optional Modify: `src/lib/users.ts`

- [ ] **Step 1: 写排班查询与修改 API 测试**

Test cases:

```ts
it('returns schedules for a date range')
it('validates start and end query params')
it('updates duty user by date')
it('returns 404 when schedule target date is invalid')
it('returns users including isActive field')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/api-schedules.spec.ts --reporter=line --workers=1
```

Expected: 因 route 缺失而失败。

- [ ] **Step 3: 实现 `GET /api/schedules`**

Requirements:
- 校验 `start`、`end`
- 调用领域层查询
- 返回 JSON

- [ ] **Step 4: 实现 `PATCH /api/schedules/:date`**

Requirements:
- 校验日期与 `userId`
- 调用已有替换逻辑或下沉后的领域逻辑
- 写入日志

- [ ] **Step 5: 实现 `GET /api/users`**

Requirements:
- 返回 `id`、`name`、`isActive`

- [ ] **Step 6: 运行完整 API 测试**

Run:

```bash
npx playwright test tests/api-schedules.spec.ts --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add src/app/api/schedules src/app/api/users src/lib/schedules.ts src/lib/users.ts tests/api-schedules.spec.ts
git commit -m "feat(api): add schedule and user REST endpoints"
```

### Task 6: 实现 token 管理 REST API

**Files:**
- Create: `src/app/api/tokens/route.ts`
- Create: `src/app/api/tokens/[id]/route.ts`

- [ ] **Step 1: 写 token 管理 API 测试**

Test cases:

```ts
it('creates token from authenticated dashboard session')
it('lists token metadata without plaintext')
it('disables token by id')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/api-tokens.spec.ts --reporter=line --workers=1
```

Expected: 因 route 缺失而失败。

- [ ] **Step 3: 实现 `POST /api/tokens` 与 `GET /api/tokens`**

Requirements:
- 仅允许已登录 Web 会话创建与查看
- POST 返回一次性明文 token
- GET 仅返回元数据

- [ ] **Step 4: 实现 `PATCH /api/tokens/:id`**

Requirements:
- 支持 `{ disabled: true }`
- 返回更新后的元数据

- [ ] **Step 5: 运行 token API 测试**

Run:

```bash
npx playwright test tests/api-tokens.spec.ts --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add src/app/api/tokens src/lib/api-tokens.ts tests/api-tokens.spec.ts
git commit -m "feat(api): add token administration endpoints"
```

## Chunk 3: 月历风格 XLSX 导出

### Task 7: 抽离 XLSX 工作簿生成器

**Files:**
- Create: `src/lib/export/calendar-xlsx.ts`
- Create: `tests/export-xlsx.spec.ts`

- [ ] **Step 1: 写 XLSX 结构测试**

Test cases:

```ts
it('creates one sheet per month')
it('renders weekday columns from monday to sunday')
it('writes date, user name, and manual marker into cells')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/export-xlsx.spec.ts --reporter=line --workers=1
```

Expected: 因 workbook builder 缺失而失败。

- [ ] **Step 3: 选择并接入 XLSX 生成实现**

Requirements:
- 输出真实 `.xlsx`
- 支持 A4 横向打印
- 每月一张 sheet

- [ ] **Step 4: 实现月历布局生成器**

Requirements:
- 7 列星期布局
- 标题、列宽、行高、换行、打印区域
- 单元格写入日期、值班人、手动调整标记

- [ ] **Step 5: 运行 XLSX 测试**

Run:

```bash
npx playwright test tests/export-xlsx.spec.ts --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add src/lib/export/calendar-xlsx.ts tests/export-xlsx.spec.ts package.json package-lock.json
git commit -m "feat(export): add calendar-style xlsx generator"
```

### Task 8: 扩展导出入口与导出弹窗

**Files:**
- Modify: `src/app/actions/export.ts`
- Modify: `src/components/ExportDialog.tsx`

- [ ] **Step 1: 写导出弹窗与下载分支测试**

Test cases:

```ts
it('shows xlsx export option in export dialog')
it('requests xlsx payload for selected date range')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/export-xlsx.spec.ts --grep "dialog" --reporter=line --workers=1
```

Expected: 因 UI 未暴露 XLSX 选项而失败。

- [ ] **Step 3: 在导出 action 中增加 XLSX 输出**

Requirements:
- 与 CSV/JSON 使用同一时间范围输入
- 返回浏览器可下载的二进制或可序列化 payload

- [ ] **Step 4: 在导出弹窗中加入 XLSX 选项**

Requirements:
- 保留 CSV/JSON
- 交互与 loading 状态一致
- 文件名包含开始和结束日期

- [ ] **Step 5: 运行导出相关测试**

Run:

```bash
npx playwright test tests/export-xlsx.spec.ts --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 6: 提交**

```bash
git add src/app/actions/export.ts src/components/ExportDialog.tsx tests/export-xlsx.spec.ts
git commit -m "feat(export): add xlsx export option to dashboard"
```

## Chunk 4: 收尾验证与文档同步

### Task 9: 补充 API 使用说明到 README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 将实际 API 路径与鉴权方式写回 README**

Include:
- `Authorization: Bearer <token>`
- schedules 查询示例
- schedules 修改示例
- token 创建流程说明

- [ ] **Step 2: 手工核对 README 示例与实际接口一致**

Run:

```bash
rg -n "/api/|Bearer|xlsx" README.md
```

Expected: README 与实现一致。

- [ ] **Step 3: 提交**

```bash
git add README.md
git commit -m "docs: document API and xlsx export usage"
```

### Task 10: 运行最终验证

**Files:**
- Verify only

- [ ] **Step 1: 运行浏览器测试**

Run:

```bash
npx playwright test tests/statistics-navigation.spec.ts tests/api-schedules.spec.ts tests/api-tokens.spec.ts tests/export-xlsx.spec.ts --reporter=line --workers=1
```

Expected: 全部通过。

- [ ] **Step 2: 运行静态检查**

Run:

```bash
npx eslint "src/**/*.{ts,tsx}" "tests/**/*.ts"
```

Expected: 无新增错误；如果已有历史问题，至少本次新增文件应保持干净。

- [ ] **Step 3: 手工检查关键路径**

Checklist:
- 登录页展示正常
- Dashboard 导出弹窗出现 XLSX
- API 用 Bearer Token 可查询排班
- API 修改排班后 UI 刷新可见

- [ ] **Step 4: 生成最终集成提交**

```bash
git add README.md src tests package.json package-lock.json
git commit -m "feat: add API, polished login, and xlsx export"
```

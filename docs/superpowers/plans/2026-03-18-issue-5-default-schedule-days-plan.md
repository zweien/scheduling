# 默认排班天数设置 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让管理员可以在设置页配置默认排班天数，并让未填写结束日期的排班生成统一按该配置执行。

**Architecture:** 复用现有 `config` 表和 `RegistrationSettings` 的设置模式，不新建独立设置系统。默认规则统一下沉到后端生成逻辑，前端只负责展示当前配置和提交修改，避免前后端规则分叉。

**Tech Stack:** Next.js App Router、Server Actions、better-sqlite3、Playwright、Node Test、ESLint

---

## 文件结构

### 需要修改

- `src/lib/config.ts`
  - 新增 `default_schedule_days` 的专用读写封装和默认值回退
- `src/lib/db/seed.ts`
  - 为新配置补初始种子值
- `src/lib/schedule.ts`
  - 让未传 `endDate` 的生成逻辑改为读取默认排班天数，而不是启用人员数
- `src/app/actions/config.ts`
  - 新增获取/更新默认排班天数的管理员 action，并写日志
- `src/app/actions/schedule.ts`
  - 生成日志文案在未传结束日期时需要反映真实推导范围
- `src/app/dashboard/settings/page.tsx`
  - 将新的默认排班天数设置卡片挂到管理员设置页
- `src/components/ScheduleGenerator.tsx`
  - 提示文案改为显示配置值，不再显示启用人数
- `src/components/RegistrationSettings.tsx`
  - 不改职责，但作为样式/交互模式参考

### 需要新增

- `src/components/DefaultScheduleDaysSettings.tsx`
  - 管理员配置默认排班天数的客户端表单组件
- `tests/default-schedule-days.test.mjs`
  - 覆盖配置回退和未传结束日期的生成逻辑
- `tests/default-schedule-days.spec.ts`
  - 覆盖设置页修改默认值和生成排班入口联动

---

## Chunk 1: 配置与生成逻辑

### Task 1: 为默认排班天数补配置封装

**Files:**
- Modify: `src/lib/config.ts`
- Modify: `src/lib/db/seed.ts`
- Test: `tests/default-schedule-days.test.mjs`

- [ ] **Step 1: 写服务层失败测试**

在 `tests/default-schedule-days.test.mjs` 中覆盖：
- 未配置 `default_schedule_days` 时返回 `21`
- 写入配置后能读到最新值

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- 因目标测试文件/函数尚未实现而失败

- [ ] **Step 3: 在配置层补最小实现**

在 `src/lib/config.ts` 中新增：
- `const DEFAULT_SCHEDULE_DAYS = 21`
- `getDefaultScheduleDays()`
- `setDefaultScheduleDays(days: number)`

要求：
- 非法配置回退到 `21`
- 保存时只接受 `>= 1` 的整数

同时在 `src/lib/db/seed.ts` 中增加：
- `ensureConfigValue(database, 'default_schedule_days', '21')`

- [ ] **Step 4: 运行服务层测试确认通过**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/lib/config.ts src/lib/db/seed.ts tests/default-schedule-days.test.mjs
git commit -m "test(config): 补充默认排班天数配置校验"
```

### Task 2: 让排班生成逻辑使用默认排班天数

**Files:**
- Modify: `src/lib/schedule.ts`
- Modify: `src/app/actions/schedule.ts`
- Test: `tests/default-schedule-days.test.mjs`

- [ ] **Step 1: 扩展失败测试**

在 `tests/default-schedule-days.test.mjs` 中新增：
- 未传 `endDate` 时按配置值推导结束日期
- 显式传入 `endDate` 时仍按手动值生成

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- FAIL，提示生成范围仍按启用人员数推导

- [ ] **Step 3: 写最小实现**

在 `src/lib/schedule.ts` 中：
- 将 `generateSchedule(startDate, endDate?)` 的无结束日期分支改为读取 `getDefaultScheduleDays()`
- 推导 `end = addDays(start, defaultScheduleDays - 1)`

在 `src/app/actions/schedule.ts` 中：
- 未传 `endDate` 时，日志不再写“自动推导”这一抽象文案
- 改为记录实际生成范围，或保证日志 target 能体现真实结束日期

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/lib/schedule.ts src/app/actions/schedule.ts tests/default-schedule-days.test.mjs
git commit -m "feat(schedule): 支持默认排班天数配置"
```

---

## Chunk 2: 管理员设置入口

### Task 3: 新增默认排班天数设置 action

**Files:**
- Modify: `src/app/actions/config.ts`
- Test: `tests/default-schedule-days.test.mjs`

- [ ] **Step 1: 增加 action 失败测试**

在 `tests/default-schedule-days.test.mjs` 中增加对 action 相关逻辑的最小测试或封装层测试：
- 非法值（空、0、负数）被拒绝
- 合法值更新成功

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- FAIL，提示缺少更新逻辑或校验不完整

- [ ] **Step 3: 写最小实现**

在 `src/app/actions/config.ts` 中新增：
- `getDefaultScheduleDaysAction()`
- `updateDefaultScheduleDaysAction(days: number)`

要求：
- `requireAdmin()`
- 后端再次校验 `days >= 1`
- 记录日志动作 `update_default_schedule_days`
- `revalidatePath('/dashboard/settings')`
- 如有必要也刷新 `/dashboard`

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/app/actions/config.ts tests/default-schedule-days.test.mjs
git commit -m "feat(config): 增加默认排班天数设置动作"
```

### Task 4: 在设置页增加管理员配置表单

**Files:**
- Create: `src/components/DefaultScheduleDaysSettings.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`
- Test: `tests/default-schedule-days.spec.ts`

- [ ] **Step 1: 写 Playwright 失败用例**

在 `tests/default-schedule-days.spec.ts` 中先覆盖：
- 管理员进入设置页可看到“默认排班天数”卡片
- 修改天数后保存成功

- [ ] **Step 2: 运行测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/default-schedule-days.spec.ts" --reporter=line --workers=1`

Expected:
- FAIL，因为页面还没有该设置项

- [ ] **Step 3: 写最小 UI 实现**

新增 `src/components/DefaultScheduleDaysSettings.tsx`：
- 数字输入框
- 保存按钮
- 错误提示
- 成功后复用现有成功 toast 机制

修改 `src/app/dashboard/settings/page.tsx`：
- 管理员区块中加入新组件
- 初值由 `getDefaultScheduleDaysAction()` 或服务端直接读取传入

- [ ] **Step 4: 运行 Playwright 确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/default-schedule-days.spec.ts" --reporter=line --workers=1`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/components/DefaultScheduleDaysSettings.tsx src/app/dashboard/settings/page.tsx tests/default-schedule-days.spec.ts
git commit -m "feat(settings): 增加默认排班天数配置入口"
```

---

## Chunk 3: 排班生成入口联动

### Task 5: 更新生成排班提示与实际行为联动

**Files:**
- Modify: `src/components/ScheduleGenerator.tsx`
- Modify: `tests/default-schedule-days.spec.ts`

- [ ] **Step 1: 扩展 Playwright 用例**

在 `tests/default-schedule-days.spec.ts` 中增加：
- 修改默认值后，生成面板显示“不填将默认排 X 天”
- 只填开始日期生成时，实际生成天数等于配置值

- [ ] **Step 2: 运行测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/default-schedule-days.spec.ts" --reporter=line --workers=1`

Expected:
- FAIL，因为生成面板仍显示启用人员数

- [ ] **Step 3: 写最小实现**

在 `src/components/ScheduleGenerator.tsx` 中：
- 移除通过 `getUsers()` 统计默认天数的逻辑
- 改为读取默认排班天数配置值
- 更新提示文案为“不填将默认排 X 天”

- [ ] **Step 4: 运行 Playwright 确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/default-schedule-days.spec.ts" --reporter=line --workers=1`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/components/ScheduleGenerator.tsx tests/default-schedule-days.spec.ts
git commit -m "feat(schedule): 生成入口显示默认排班天数"
```

---

## Chunk 4: 总体验证与收尾

### Task 6: 回归验证并整理交付

**Files:**
- Verify only

- [ ] **Step 1: 运行服务层测试**

Run: `node --test "tests/default-schedule-days.test.mjs"`

Expected:
- PASS

- [ ] **Step 2: 运行端到端测试**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/default-schedule-days.spec.ts" --reporter=line --workers=1`

Expected:
- PASS

- [ ] **Step 3: 运行 lint**

Run: `npm run lint`

Expected:
- PASS

- [ ] **Step 4: 检查工作区**

Run: `git status --short`

Expected:
- 仅包含本需求相关文件

- [ ] **Step 5: 最终提交**

```bash
git add src/lib/config.ts src/lib/db/seed.ts src/lib/schedule.ts src/app/actions/config.ts src/app/actions/schedule.ts src/app/dashboard/settings/page.tsx src/components/DefaultScheduleDaysSettings.tsx src/components/ScheduleGenerator.tsx tests/default-schedule-days.test.mjs tests/default-schedule-days.spec.ts
git commit -m "feat(settings): 支持默认排班天数配置"
```

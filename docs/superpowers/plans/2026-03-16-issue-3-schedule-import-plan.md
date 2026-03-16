# Issue #3 排班导入 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为排班页增加基于模板的排班导入能力，支持预检、冲突策略选择和结果统计。

**Architecture:** 复用现有“先校验、后导入”的两阶段模式，但为排班导入建立独立的模板生成、预检和执行模块，避免和人员导入逻辑混用。UI 入口放在排班页动作区，服务端通过独立 action 串联模板下载、预检和执行导入。

**Tech Stack:** Next.js、TypeScript、Server Actions、Playwright、SQLite、ExcelJS

---

## 文件结构

**Create:**
- `src/lib/imports/schedule-import-template.ts`
- `src/lib/imports/schedule-import.ts`
- `src/components/ScheduleImportDialog.tsx`
- `tests/schedule-import.spec.ts`

**Modify:**
- `src/types/index.ts`
- `src/app/actions/schedule.ts`
- `src/components/Header.tsx`
- `src/components/DashboardHomeClient.tsx`
- `src/lib/schedules.ts`
- `tests/dashboard-sections.spec.ts`

**Maybe Modify:**
- `src/app/dashboard/page.tsx`
- `src/components/CalendarView.tsx`

## Chunk 1: 数据契约与模板

### Task 1: 定义排班导入类型

**Files:**
- Modify: `src/types/index.ts`
- Test: `tests/schedule-import.spec.ts`

- [ ] **Step 1: 先写失败测试，描述预检结果的核心行为**

测试至少覆盖：
- 合法文件能产出标准化行
- 文件内日期重复会被标记为错误
- 系统已有日期会被标记为冲突

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，提示缺少导入入口或导入能力

- [ ] **Step 3: 在 `src/types/index.ts` 增加排班导入相关类型**

最小需要：
- `ScheduleImportRow`
- `ScheduleImportIssue`
- `ScheduleImportConflict`
- `ScheduleImportPreview`
- `ScheduleImportStrategy`

- [ ] **Step 4: 重新运行测试，确认仍然因实现缺失而失败**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，但错误已收敛到实现缺失而不是类型缺失

### Task 2: 增加排班导入模板生成器

**Files:**
- Create: `src/lib/imports/schedule-import-template.ts`
- Test: `tests/schedule-import.spec.ts`

- [ ] **Step 1: 为模板下载写失败测试**

覆盖点：
- 可下载 `.xlsx`
- 表头为 `日期 / 值班人员姓名 / 是否手动调整 / 备注`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "模板" --reporter=line --workers=1
```

Expected: FAIL

- [ ] **Step 3: 实现最小模板生成器**

要求：
- 只生成一张工作表
- 固定表头
- 提供一行示例数据

- [ ] **Step 4: 运行模板相关测试确认转绿**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "模板" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/types/index.ts src/lib/imports/schedule-import-template.ts tests/schedule-import.spec.ts
git commit -m "feat: add schedule import template types"
```

## Chunk 2: 预检与导入服务

### Task 3: 实现排班导入预检服务

**Files:**
- Create: `src/lib/imports/schedule-import.ts`
- Modify: `src/lib/schedules.ts`
- Test: `tests/schedule-import.spec.ts`

- [ ] **Step 1: 写失败测试覆盖预检规则**

覆盖点：
- 非法文件返回“无法解析”
- 日期为空或格式错误返回 issue
- 姓名无法匹配返回 issue
- 文件内重复日期返回 issue
- 系统已有日期返回 conflict

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "预检|冲突" --reporter=line --workers=1
```

Expected: FAIL

- [ ] **Step 3: 在 `src/lib/schedules.ts` 增加最小查询能力**

优先新增：
- 按日期列表批量查询已有排班

不要把导入策略分支塞进 `schedules.ts`

- [ ] **Step 4: 在 `src/lib/imports/schedule-import.ts` 实现预检**

实现要点：
- 复用 ExcelJS 解析
- 校验表头
- 标准化日期
- 按姓名匹配现有人员
- 区分 `issues` 和 `conflicts`

- [ ] **Step 5: 运行预检测试确认转绿**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "预检|冲突" --reporter=line --workers=1
```

Expected: PASS

### Task 4: 实现三种导入策略

**Files:**
- Modify: `src/lib/imports/schedule-import.ts`
- Modify: `src/lib/schedules.ts`
- Test: `tests/schedule-import.spec.ts`

- [ ] **Step 1: 为 `skip` / `overwrite` / `mark_conflicts` 写失败测试**

覆盖点：
- `skip` 只导入无冲突记录
- `overwrite` 会覆盖已有日期
- `mark_conflicts` 不写库

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "跳过|覆盖|冲突清单" --reporter=line --workers=1
```

Expected: FAIL

- [ ] **Step 3: 在导入服务中实现策略分支**

要求：
- 导入前重新执行服务端预检
- 有阻断性错误直接返回失败
- `overwrite` 通过现有 `setSchedule()` 覆盖
- `mark_conflicts` 仅返回统计

- [ ] **Step 4: 运行策略测试确认转绿**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "跳过|覆盖|冲突清单" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/lib/imports/schedule-import.ts src/lib/schedules.ts tests/schedule-import.spec.ts
git commit -m "feat: add schedule import preview and strategies"
```

## Chunk 3: Server Actions 与页面入口

### Task 5: 扩展排班 actions

**Files:**
- Modify: `src/app/actions/schedule.ts`
- Test: `tests/schedule-import.spec.ts`

- [ ] **Step 1: 为 action 层写失败测试**

覆盖点：
- 能下载模板
- 能返回预检结果
- 能按策略执行导入

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "下载模板|开始导入" --reporter=line --workers=1
```

Expected: FAIL

- [ ] **Step 3: 在 `src/app/actions/schedule.ts` 增加导入相关 action**

建议最小集合：
- `downloadScheduleTemplateAction`
- `previewScheduleImportAction`
- `importScheduleAction`

- [ ] **Step 4: 补审计日志与页面 revalidate**

至少覆盖：
- `/dashboard`
- 导入入口所在页面

- [ ] **Step 5: 重新运行 action 相关测试**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" --grep "下载模板|开始导入" --reporter=line --workers=1
```

Expected: PASS

### Task 6: 增加排班页导入入口与对话框

**Files:**
- Create: `src/components/ScheduleImportDialog.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/DashboardHomeClient.tsx`
- Test: `tests/dashboard-sections.spec.ts`
- Test: `tests/schedule-import.spec.ts`

- [ ] **Step 1: 先写失败 UI 回归**

覆盖点：
- 排班页能看到“导入排班”按钮
- 点击后能打开对话框
- 未校验时“开始导入”禁用

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
npx playwright test "tests/dashboard-sections.spec.ts" "tests/schedule-import.spec.ts" --reporter=line --workers=1
```

Expected: FAIL

- [ ] **Step 3: 实现最小对话框组件**

至少包含：
- 模板下载按钮
- 文件选择
- 校验按钮
- 冲突策略选择
- 结果摘要
- 冲突列表

- [ ] **Step 4: 将入口挂到排班页动作区**

要求：
- 仅管理员可见
- 不影响现有统计/导出/打印入口

- [ ] **Step 5: 运行页面回归确认转绿**

Run:

```bash
npx playwright test "tests/dashboard-sections.spec.ts" "tests/schedule-import.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 6: 提交本任务**

```bash
git add src/app/actions/schedule.ts src/components/ScheduleImportDialog.tsx src/components/Header.tsx src/components/DashboardHomeClient.tsx tests/dashboard-sections.spec.ts tests/schedule-import.spec.ts
git commit -m "feat: add schedule import dialog"
```

## Chunk 4: 全流程回归

### Task 7: 跑首版关键回归并记录剩余风险

**Files:**
- Test: `tests/schedule-import.spec.ts`
- Test: `tests/dashboard-sections.spec.ts`
- Test: `tests/login-page.spec.ts`

- [ ] **Step 1: 运行首版关键回归**

Run:

```bash
npx playwright test "tests/schedule-import.spec.ts" "tests/dashboard-sections.spec.ts" "tests/login-page.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 2: 运行 lint**

Run:

```bash
npm run lint
```

Expected: PASS

- [ ] **Step 3: 记录剩余风险**

明确记录：
- 重名人员匹配歧义仍未解决
- 备注字段仍未落库
- 暂不支持逐条人工确认冲突

- [ ] **Step 4: 提交最终收尾**

```bash
git add src tests
git commit -m "feat: add schedule import workflow"
```

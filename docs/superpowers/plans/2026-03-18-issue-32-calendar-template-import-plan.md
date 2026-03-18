# 月历式值班表模板导入 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有导入排班面板中保留标准模板，同时新增月历模板导入能力，并复用现有预检、冲突处理和导入流程。

**Architecture:** 通过显式模板类型切换把导入入口分成 `standard` 和 `calendar` 两条解析分支。月历模板先由独立解析器展开成标准排班行结构，再复用现有 `previewScheduleImport` / `importScheduleRows` 链路，避免重复实现冲突检测和导入统计。

**Tech Stack:** Next.js App Router、Server Actions、ExcelJS、better-sqlite3、Playwright、Node Test、ESLint

---

## 文件结构

### 需要修改

- `src/components/ScheduleImportDialog.tsx`
  - 增加模板类型切换、月历模板下载按钮和对应文案
- `src/app/actions/schedule.ts`
  - 模板下载、预检、导入 action 增加模板类型参数
- `src/lib/imports/schedule-import.ts`
  - 让现有预检/导入链路支持从不同模板来源接收标准行数据
- `src/lib/imports/schedule-import-template.ts`
  - 保留现有标准模板构建，同时为月历模板构建提供入口
- `src/types/index.ts`
  - 增加模板类型枚举

### 需要新增

- `src/lib/imports/calendar-schedule-import.ts`
  - 解析月历模板 `.xlsx`，输出标准排班行
- `tests/calendar-schedule-import.test.mjs`
  - 覆盖月历模板解析与错误分支
- `tests/calendar-template-import.spec.ts`
  - 覆盖导入面板模板切换、预检和导入成功/失败流程

---

## Chunk 1: 解析层

### Task 1: 为月历模板解析器写失败测试

**Files:**
- Create: `tests/calendar-schedule-import.test.mjs`
- Create: `src/lib/imports/calendar-schedule-import.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/calendar-schedule-import.test.mjs` 中覆盖以下场景：
- 正常单月月历模板可解析为标准行
- 首周不完整可解析
- 末周不完整可解析
- Excel 序列号日期可正确转换
- 重复日期会报错
- 跨月日期会报错
- 值班员为空会报错

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- FAIL，因为解析器尚未实现

- [ ] **Step 3: 写最小解析器实现**

在 `src/lib/imports/calendar-schedule-import.ts` 中实现：
- 定位星期头
- 按周块两行解析
- 统一转换为标准排班行：
  - `date`
  - `userName`
  - `isManual: true`
  - `notes: ''`

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/lib/imports/calendar-schedule-import.ts tests/calendar-schedule-import.test.mjs
git commit -m "feat(import): 增加月历模板解析器"
```

---

## Chunk 2: 导入服务编排

### Task 2: 为模板类型分支写失败测试

**Files:**
- Modify: `src/lib/imports/schedule-import.ts`
- Modify: `src/types/index.ts`
- Test: `tests/calendar-schedule-import.test.mjs`

- [ ] **Step 1: 扩展失败测试**

在 `tests/calendar-schedule-import.test.mjs` 中补充服务层编排测试：
- `standard` 模板仍按原逻辑工作
- `calendar` 模板会先走月历解析器，再进入预检
- 月历模板中无法匹配的人名会形成 issue

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- FAIL，提示缺少模板类型分支或输出结构不匹配

- [ ] **Step 3: 写最小实现**

在 `src/types/index.ts` 中增加模板类型：
- `ScheduleImportTemplateType = 'standard' | 'calendar'`

在 `src/lib/imports/schedule-import.ts` 中：
- 为 `previewScheduleImport` 增加模板类型参数
- `standard` 继续读取当前表头模板
- `calendar` 调用新解析器得到标准行后复用现有预检/冲突检测

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/lib/imports/schedule-import.ts src/types/index.ts tests/calendar-schedule-import.test.mjs
git commit -m "feat(import): 支持月历模板预检分支"
```

### Task 3: 让导入 action 支持模板类型

**Files:**
- Modify: `src/app/actions/schedule.ts`
- Modify: `src/lib/imports/schedule-import-template.ts`
- Test: `tests/calendar-schedule-import.test.mjs`

- [ ] **Step 1: 增加失败测试或断言**

在 `tests/calendar-schedule-import.test.mjs` 中增加最小覆盖：
- 模板下载可区分标准模板和月历模板
- 导入 action 调用时模板类型会透传到底层服务

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- FAIL，说明 action 仍只支持标准模板

- [ ] **Step 3: 写最小实现**

在 `src/app/actions/schedule.ts` 中：
- `downloadScheduleTemplateAction(templateType)`
- `previewScheduleImportAction(fileBase64, templateType)`
- `importScheduleAction(fileBase64, strategy, templateType)`

在 `src/lib/imports/schedule-import-template.ts` 中：
- 保留标准模板构建
- 新增月历模板 workbook 构建函数

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/app/actions/schedule.ts src/lib/imports/schedule-import-template.ts tests/calendar-schedule-import.test.mjs
git commit -m "feat(import): 支持月历模板下载与导入动作"
```

---

## Chunk 3: 前端导入面板

### Task 4: 为模板类型切换写 Playwright 失败用例

**Files:**
- Create: `tests/calendar-template-import.spec.ts`
- Modify: `src/components/ScheduleImportDialog.tsx`

- [ ] **Step 1: 写失败用例**

在 `tests/calendar-template-import.spec.ts` 中覆盖：
- 导入对话框可切换 `标准模板` / `月历模板`
- 月历模板模式下显示对应下载按钮或说明
- 上传错误月历模板时显示清晰错误

- [ ] **Step 2: 运行测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-template-import.spec.ts" --reporter=line --workers=1`

Expected:
- FAIL，因为对话框还没有模板类型切换

- [ ] **Step 3: 写最小 UI 实现**

在 `src/components/ScheduleImportDialog.tsx` 中：
- 增加模板类型切换状态
- 下载模板按钮按类型调用
- 校验/导入动作按类型传参
- 月历模板模式下显示结构说明

- [ ] **Step 4: 运行测试确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-template-import.spec.ts" --reporter=line --workers=1`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/components/ScheduleImportDialog.tsx tests/calendar-template-import.spec.ts
git commit -m "feat(import): 导入面板支持模板类型切换"
```

### Task 5: 打通月历模板导入成功路径

**Files:**
- Modify: `tests/calendar-template-import.spec.ts`
- Modify: `src/components/ScheduleImportDialog.tsx`

- [ ] **Step 1: 扩展 Playwright 用例**

在 `tests/calendar-template-import.spec.ts` 中增加：
- 上传合法月历模板后可以看到预检结果
- 选择冲突策略后可完成导入
- 导入结果落库正确

- [ ] **Step 2: 运行测试确认失败**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-template-import.spec.ts" --reporter=line --workers=1`

Expected:
- FAIL，说明月历模板还没有真正接通预检/导入链路

- [ ] **Step 3: 写最小实现**

补齐对话框状态与结果展示中的模板类型联动，确保：
- 月历模板预检结果正确渲染
- 现有冲突策略仍可复用
- 成功导入后刷新数据

- [ ] **Step 4: 运行测试确认通过**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-template-import.spec.ts" --reporter=line --workers=1`

Expected:
- PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/components/ScheduleImportDialog.tsx tests/calendar-template-import.spec.ts
git commit -m "feat(import): 打通月历模板导入流程"
```

---

## Chunk 4: 总体验证与收尾

### Task 6: 回归验证并整理交付

**Files:**
- Verify only

- [ ] **Step 1: 运行 Node 测试**

Run: `node --test "tests/calendar-schedule-import.test.mjs"`

Expected:
- PASS

- [ ] **Step 2: 运行端到端测试**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/calendar-template-import.spec.ts" "tests/schedule-import.spec.ts" --reporter=line --workers=1`

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
git add src/components/ScheduleImportDialog.tsx src/app/actions/schedule.ts src/lib/imports/schedule-import.ts src/lib/imports/schedule-import-template.ts src/lib/imports/calendar-schedule-import.ts src/types/index.ts tests/calendar-schedule-import.test.mjs tests/calendar-template-import.spec.ts
git commit -m "feat(import): 支持月历模板导入"
```

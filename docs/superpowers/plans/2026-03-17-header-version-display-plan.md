# 页面标题下方显示系统版本 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在系统顶部标题区域下方显示当前系统版本号，并优先使用 `git tag` 作为版本来源。

**Architecture:** 通过 `next.config.ts` 在构建期注入 `APP_VERSION`，避免页面运行时依赖 `.git`。版本格式化和回退逻辑集中在独立工具模块中，`Header` 组件只负责展示字符串。

**Tech Stack:** Next.js、TypeScript、Node.js、Playwright、ESLint

---

## 文件结构

**Create:**
- `src/lib/app-version.ts`
- `tests/app-version.test.mjs`

**Modify:**
- `next.config.ts`
- `src/components/Header.tsx`
- `tests/dashboard-sections.spec.ts`

## Chunk 1: 版本来源与格式化

### Task 1: 增加版本解析工具

**Files:**
- Create: `src/lib/app-version.ts`
- Test: `tests/app-version.test.mjs`

- [ ] **Step 1: 先写失败测试**

覆盖：
- `APP_VERSION` 存在时优先返回该值
- 缺失时回退到 `package.json.version`
- 输出始终带 `v`
- 异常输入时回退为 `v0.0.0-dev`

- [ ] **Step 2: 运行测试确认红灯**

Run:

```bash
node --test "tests/app-version.test.mjs"
```

Expected: FAIL，提示缺少版本工具模块

- [ ] **Step 3: 实现最小版本工具**

要求：
- 暴露单一获取函数
- 内部封装格式化与回退逻辑
- 不在组件中直接读取 `package.json`

- [ ] **Step 4: 重新运行测试确认转绿**

Run:

```bash
node --test "tests/app-version.test.mjs"
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/lib/app-version.ts tests/app-version.test.mjs
git commit -m "feat: add app version resolver"
```

## Chunk 2: 构建期注入版本

### Task 2: 在 Next.js 配置中注入 APP_VERSION

**Files:**
- Modify: `next.config.ts`
- Test: `tests/app-version.test.mjs`

- [ ] **Step 1: 为构建期版本来源补失败测试或断言**

覆盖：
- 配置层能容忍没有 tag 的环境
- 注入值缺失时应用层仍可回退

- [ ] **Step 2: 运行测试确认当前不足**

Run:

```bash
node --test "tests/app-version.test.mjs"
```

Expected: FAIL 或现有断言不足

- [ ] **Step 3: 在 `next.config.ts` 注入 APP_VERSION**

要求：
- 尝试执行 `git describe --tags --abbrev=0`
- 执行失败不抛错
- 不引入复杂构建逻辑

- [ ] **Step 4: 重新运行测试确认通过**

Run:

```bash
node --test "tests/app-version.test.mjs"
```

Expected: PASS

## Chunk 3: Header 展示

### Task 3: 在标题下方展示版本号

**Files:**
- Modify: `src/components/Header.tsx`
- Test: `tests/dashboard-sections.spec.ts`

- [ ] **Step 1: 先补失败页面回归**

覆盖：
- 登录后 Header 标题区显示版本文本
- 现有标题仍可见
- 导航链接不受影响

- [ ] **Step 2: 运行回归确认红灯**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/dashboard-sections.spec.ts" --reporter=line --workers=1
```

Expected: FAIL，缺少版本文本

- [ ] **Step 3: 在 Header 中接入版本展示**

要求：
- 放在“值班排班系统”下方
- 样式弱化
- 移动端和桌面端均可见

- [ ] **Step 4: 运行页面回归确认转绿**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/dashboard-sections.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add next.config.ts src/components/Header.tsx tests/dashboard-sections.spec.ts
git commit -m "feat: show app version in header"
```

## Chunk 4: 最终验证

### Task 4: 跑关键回归并收尾

**Files:**
- Test: `tests/app-version.test.mjs`
- Test: `tests/dashboard-sections.spec.ts`
- Test: `tests/login-page.spec.ts`

- [ ] **Step 1: 运行版本工具测试**

Run:

```bash
node --test "tests/app-version.test.mjs"
```

Expected: PASS

- [ ] **Step 2: 运行关键页面回归**

Run:

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/dashboard-sections.spec.ts" "tests/login-page.spec.ts" --reporter=line --workers=1
```

Expected: PASS

- [ ] **Step 3: 运行 lint**

Run:

```bash
npm run lint
```

Expected: PASS

- [ ] **Step 4: 提交最终收尾**

```bash
git add src tests next.config.ts
git commit -m "feat: display version under header title"
```

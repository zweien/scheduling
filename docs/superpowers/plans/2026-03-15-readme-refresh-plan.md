# README 重写与截图更新 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 README 并生成一组最新系统截图，使仓库首页与当前产品能力保持一致。

**Architecture:** 先用稳定数据生成新的页面截图，再基于最新页面结构重写 README。截图和文案都只反映真实现状，不通过额外 UI 改动制造展示效果。

**Tech Stack:** Next.js、Playwright、Markdown

---

## 文件结构

**Create:**
- `docs/screenshots/login-page.png`
- `docs/screenshots/dashboard-calendar.png`
- `docs/screenshots/duty-users-page.png`
- `docs/screenshots/settings-page.png`
- `docs/screenshots/audit-logs-page.png`
- `docs/screenshots/export-page.png`

**Modify:**
- `README.md`

## Chunk 1: 截图生成

### Task 1: 准备截图所需页面

**Files:**
- Reuse existing app routes

- [ ] **Step 1: 启动本地服务**

Run: `npm run dev`
Expected: 本地服务可访问

- [ ] **Step 2: 确认截图页面**

目标页面：
- `/`
- `/dashboard`
- `/dashboard/users`
- `/dashboard/settings`
- `/dashboard/logs`
- `/dashboard/export`

### Task 2: 生成截图

**Files:**
- Create: `docs/screenshots/*.png`

- [ ] **Step 1: 生成登录页截图**
- [ ] **Step 2: 生成月历主界面截图**
- [ ] **Step 3: 生成值班人员管理页截图**
- [ ] **Step 4: 生成设置页截图**
- [ ] **Step 5: 生成日志页截图**
- [ ] **Step 6: 生成导出页截图**

## Chunk 2: README 重写

### Task 3: 更新 README 顶部定位与能力摘要

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新一句话定位**
- [ ] **Step 2: 更新核心能力说明**
- [ ] **Step 3: 去掉与旧交互不一致的描述**

### Task 4: 更新截图和功能分区

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 替换系统截图区**
- [ ] **Step 2: 增加多用户与权限说明**
- [ ] **Step 3: 增加值班人员批量导入说明**
- [ ] **Step 4: 更新日志与 API 描述**

### Task 5: 更新快速开始与部署入口

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 修正登录与初始化说明**
- [ ] **Step 2: 增加部署文档入口**
- [ ] **Step 3: 更新项目结构概览**

## Chunk 3: 验证

### Task 6: 检查 README 与截图引用

**Files:**
- Modify: `README.md`
- Create: `docs/screenshots/*.png`

- [ ] **Step 1: 检查图片路径有效**

Run: `rg -n "docs/screenshots/" "README.md"`
Expected: 全部指向新截图文件

- [ ] **Step 2: 检查 README 无过时描述**

手动核对：
- 不再写共享密码登录
- 不再把账号管理和人员管理混写
- 体现批量导入、审计日志、移动端移动模式

- [ ] **Step 3: 记录结果，准备交付**

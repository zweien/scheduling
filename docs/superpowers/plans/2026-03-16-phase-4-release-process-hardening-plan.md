# Phase 4 Release Process Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善项目发布流程文档和 GitHub Release 模板，使当前 release 驱动部署具备明确的发版与回滚规范。

**Architecture:** 保持现有 `Deploy to VPS` workflow 不变，只新增发布规范文档和 `.github/release.yml`，并同步更新现有 `vps.md` 的部署说明，使它与当前 workflow 行为完全一致。

**Tech Stack:** GitHub Actions、GitHub Releases、Markdown、YAML

---

## Chunk 1: 发布规范文档

### Task 1: 新增 release 发布说明

**Files:**
- Create: `docs/deployment/releases.md`

- [ ] Step 1: 写发布前检查列表
- [ ] Step 2: 写 tag 与 release 创建步骤
- [ ] Step 3: 写部署验证步骤
- [ ] Step 4: 写回滚到上一个 release tag 的步骤
- [ ] Step 5: 提交本任务改动

## Chunk 2: Release Notes 模板

### Task 2: 增加 GitHub release 配置

**Files:**
- Create: `.github/release.yml`

- [ ] Step 1: 定义 release notes 分类规则
- [ ] Step 2: 覆盖功能、修复、文档/运维三类
- [ ] Step 3: 验证 YAML 可解析
- [ ] Step 4: 提交本任务改动

## Chunk 3: 部署文档同步

### Task 3: 更新 VPS 部署文档

**Files:**
- Modify: `docs/deployment/vps.md`

- [ ] Step 1: 将触发方式改写为 release published
- [ ] Step 2: 补充 `workflow_dispatch` 按 tag 手动部署说明
- [ ] Step 3: 将回滚说明改成 tag/release 优先
- [ ] Step 4: 提交本任务改动

## Chunk 4: 整体验证

### Task 4: 文档与配置校验

**Files:**
- Verify: `docs/deployment/releases.md`
- Verify: `docs/deployment/vps.md`
- Verify: `.github/release.yml`

- [ ] Step 1: 运行 YAML 解析校验
- [ ] Step 2: 检查文档与当前 workflow 一致
- [ ] Step 3: 检查 `git diff --stat`，确认没有混入业务代码
- [ ] Step 4: 使用 Conventional Commits 提交阶段 4 改动

# v1.1.0 发布实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库版本统一到 `1.1.0`，创建 `v1.1.0` tag，并发布对应的 GitHub Release。

**Architecture:** 保持现有“tag 优先、`package.json` 回退”的版本展示实现不变，只修正其版本输入来源。发布动作分为三段：先更新代码与 README，再做本地验证，最后创建 tag 与 GitHub Release，确保每一步都可单独核对。

**Tech Stack:** Git、GitHub CLI、Node.js、npm、Next.js、Markdown

---

## 文件结构

- 修改: `package.json`
  - 根包版本更新为 `1.1.0`
- 修改: `package-lock.json`
  - 根包和 lockfile 顶层版本同步到 `1.1.0`
- 修改: `README.md`
  - 只同步与当前版本和发布状态相关的说明
- 验证: `git tag`, `gh release view`
  - 确认 `v1.1.0` tag 和 release 已建立

## Chunk 1: 代码版本统一

### Task 1: 先写最小版本一致性测试

**Files:**
- Create: `tests/release-version.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 写失败测试，校验 `package.json` 与 `package-lock.json` 根版本一致**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('package versions stay aligned', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  assert.equal(pkg.version, '1.1.0');
  assert.equal(lock.version, '1.1.0');
  assert.equal(lock.packages[''].version, '1.1.0');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/release-version.test.mjs"`
Expected: FAIL，显示当前版本仍为 `0.1.0`

- [ ] **Step 3: 将版本更新为 `1.1.0`**

要求：

- `package.json.version = 1.1.0`
- `package-lock.json.version = 1.1.0`
- `package-lock.json.packages[""].version = 1.1.0`

- [ ] **Step 4: 再次运行测试确认通过**

Run: `node --test "tests/release-version.test.mjs"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add package.json package-lock.json tests/release-version.test.mjs
git commit -m "chore: bump version to 1.1.0"
```

## Chunk 2: README 同步

### Task 2: 更新 README 中与发布相关的内容

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 先定位 README 中过时或缺失的发布说明**

检查点：

- 是否显式写明当前版本
- 是否说明页面版本显示与 tag 的关系
- 是否保留明显过时的版本文字

- [ ] **Step 2: 做最小必要更新**

要求：

- 增加当前版本号 `v1.1.0`
- 文案与当前 release/tag 驱动的发布状态一致
- 不改写与版本无关的章节

- [ ] **Step 3: 人工核对 README 差异**

Run: `git diff -- README.md`
Expected: 只包含版本和发布说明相关的最小改动

- [ ] **Step 4: 提交**

```bash
git add README.md
git commit -m "docs: refresh readme for v1.1.0 release"
```

## Chunk 3: 本地验证

### Task 3: 跑发布前校验

**Files:**
- Verify: `package.json`
- Verify: `package-lock.json`
- Verify: `README.md`
- Verify: `tests/release-version.test.mjs`

- [ ] **Step 1: 运行版本一致性测试**

Run: `node --test "tests/release-version.test.mjs"`
Expected: PASS

- [ ] **Step 2: 运行 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: 检查工作区只剩本次发布相关变更**

Run: `git status --short`
Expected: 无未提交的发布相关变更

## Chunk 4: Tag 与 GitHub Release

### Task 4: 创建并推送 `v1.1.0` tag

**Files:**
- Verify: Git tag metadata

- [ ] **Step 1: 确认本地不存在同名 tag**

Run: `git tag --list "v1.1.0"`
Expected: 空输出

- [ ] **Step 2: 创建 annotated tag**

Run:

```bash
git tag -a "v1.1.0" -m "Release v1.1.0"
```

- [ ] **Step 3: 推送 tag**

Run: `git push origin "v1.1.0"`
Expected: 远端新增 tag

### Task 5: 创建 GitHub Release

**Files:**
- Verify: GitHub Release metadata

- [ ] **Step 1: 用中文 release notes 创建 release**

Run:

```bash
gh release create "v1.1.0" --title "v1.1.0" --notes-file <temp-file>
```

Release notes 至少包含：

- 新增与改进
- 修复
- 版本统一说明

- [ ] **Step 2: 校验 release 信息**

Run: `gh release view "v1.1.0" --json tagName,name,publishedAt,url`
Expected: tag 和标题都为 `v1.1.0`

## Chunk 5: 最终收尾

### Task 6: 汇总发布结果

**Files:**
- Verify: `README.md`
- Verify: `package.json`
- Verify: `package-lock.json`

- [ ] **Step 1: 记录最终发布信息**

输出内容：

- 版本号 `v1.1.0`
- tag
- release 链接
- 关键验证命令

- [ ] **Step 2: 确认主分支状态**

Run: `git status --short --branch`
Expected: 没有本次发布遗漏的未提交改动

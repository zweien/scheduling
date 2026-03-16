# 发布流程说明

本文档定义当前仓库的正式发版路径。当前生产部署由 GitHub Release 触发，而不是普通 `master` push。

## 版本号规则

使用 `v<major>.<minor>.<patch>`：

- `patch`：缺陷修复、部署修正、文档与运维调整
- `minor`：新增功能、接口增强、可见能力扩展
- `major`：不兼容变更

示例：

- `v1.0.1`
- `v1.1.0`
- `v2.0.0`

## 发布前检查

发布前至少完成：

```bash
npm run lint
SESSION_SECRET=test_secret_for_build_validation_123456789 S_PORT=3018 npm run build
```

如本次改动涉及关键业务流程，补跑对应 Playwright 回归。

## 创建发布

1. 确认当前 `master` 已包含要发布的提交
2. 创建并推送 tag
3. 创建 GitHub Release

示例：

```bash
git checkout master
git pull --ff-only
git tag -a "v1.0.1" -m "Release v1.0.1"
git push origin "v1.0.1"
gh release create "v1.0.1" --title "v1.0.1" --generate-notes
```

发布后会自动触发 `Deploy to VPS` workflow，并按该 tag 部署。

## 手动按 Tag 部署

如需重试或手动部署某个已存在版本，可在 GitHub Actions 页面手动运行 `Deploy to VPS`，并填写：

- `tag=v1.0.1`

该流程不会读取 `master` 最新状态，而是严格部署指定 tag。

## 发布后验证

检查 GitHub Actions：

- Workflow：`Deploy to VPS`
- Event：`release` 或 `workflow_dispatch`
- 目标 tag 正确
- `Deploy application` 步骤成功

服务器侧至少验证：

```bash
pm2 status
pm2 logs scheduling --lines 50
curl -I "http://127.0.0.1:3018"
```

## 回滚

优先回滚到上一个稳定 tag，而不是临时找 commit。

示例：

```bash
cd /opt/scheduling
git fetch --all --tags
git checkout "tags/v1.0.0" -B release-deploy
npm ci --include=dev
set -a
source ./.env.production
set +a
npm run build
pm2 kill || true
pm2 start ecosystem.config.js --env production --update-env
pm2 save
```

如果只想通过 GitHub Actions 回滚，可手动运行 `Deploy to VPS`，填入旧 tag。

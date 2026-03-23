# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

值班排班系统 - 为小团队（5-10人）开发的内部值班管理系统，支持自动排班、手动调整、统计和日志功能。

## 常用命令

```bash
# 开发
bun dev              # 启动开发服务器 (http://localhost:3000)

# 构建
bun run build        # 生产构建
bun start            # 启动生产服务器

# 代码检查
bun lint             # 运行 ESLint
```

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: SQLite + better-sqlite3（同步 API）
- **Session**: iron-session
- **拖拽**: @dnd-kit
- **日期**: date-fns

## 架构

### 数据库（`data/scheduling.db`）

SQLite 数据库，使用 better-sqlite3 同步 API，在 `src/lib/db.ts` 初始化：

| 表 | 用途 |
|---|---|
| `users` | 人员信息，`sort_order` 字段决定排班顺序 |
| `schedules` | 排班记录，`date` 唯一，`is_manual` 标记手动调整 |
| `logs` | 操作日志，记录所有变更的前后值 |
| `config` | 系统配置（如密码） |

### 目录结构

```
src/
├── app/
│   ├── actions/     # Server Actions（所有数据操作）
│   ├── dashboard/   # 主界面（需登录）
│   └── page.tsx     # 登录页
├── components/
│   ├── ui/          # shadcn/ui 组件
│   └── *.tsx        # 业务组件
├── lib/
│   ├── db.ts        # 数据库连接与表初始化
│   ├── session.ts   # iron-session 配置
│   ├── auth.ts      # 认证逻辑
│   ├── users.ts     # 人员 CRUD
│   ├── schedules.ts # 排班 CRUD
│   └── logs.ts      # 日志记录
└── types/index.ts   # TypeScript 类型定义
```

### 认证流程

- 简单密码模式，所有人共享一个密码（默认 `123456`）
- `src/lib/auth.ts` 提供认证函数
- `src/app/dashboard/layout.tsx` 检查登录状态，未登录重定向到首页
- Session 密码可配置环境变量 `SESSION_SECRET`

### 排班逻辑

- 自动排班按 `users.sort_order` 顺序循环分配
- 手动调整后设置 `is_manual = 1`，自动排班时保留
- 支持替换（点击选择）和交换（拖拽）

## 开发注意事项

- better-sqlite3 使用同步 API，无需 await
- 数据库操作封装在 `src/lib/*.ts`，Server Actions 在 `src/app/actions/*.ts`
- 路径别名 `@/*` 映射到 `./src/*`
- 使用 `sonner` 组件显示 Toast 通知

## 版本发布与部署

### 版本号约定

- GitHub Release 与 git tag 使用 `vX.Y.Z` 格式
- `package.json.version` 与 tag 保持一致
- README.md 中标注当前版本号

### 发布流程

```bash
# 1. 更新版本号
# - 修改 package.json 中的 version
# - 修改 README.md 中的当前版本号

# 2. 提交更改
git add package.json README.md
git commit -m "chore: bump version to v1.X.X"

# 3. 创建 tag 并推送
git tag v1.X.X
git push
git push origin v1.X.X

# 4. 创建 GitHub Release（触发自动部署）
gh release create v1.X.X --title "v1.X.X" --notes "更新内容..."
```

### 部署机制

- **触发条件**: GitHub Release 发布（`release.published` 事件）
- **部署目标**: VPS + PM2 + Nginx
- **Workflow 文件**: `.github/workflows/deploy-vps.yml`
- **监控部署**: `gh run list --limit 1` 或 `gh run view <run-id>`

### 部署状态检查

```bash
# 查看最近的部署
gh run list --limit 5

# 查看部署详情
gh run view <run-id>

# 查看部署日志
gh run view --job=<job-id> --log
```

### 手动触发部署

如需在不创建新 release 的情况下部署，可手动触发：

```bash
gh workflow run deploy-vps.yml -f tag=v1.X.X
```

### 验证部署成功

```bash
# 检查服务状态
curl -sI https://scheduling.zweien.xyz/

# 或检查 GitHub Actions 日志确认 PM2 状态为 online
```

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

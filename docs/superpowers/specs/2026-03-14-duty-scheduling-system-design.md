# 值班排班系统设计文档

## 概述

为小团队（5-10人）开发的内部值班排班系统，支持自动排班、手动调整、统计和日志功能。

## 技术栈

| 领域 | 技术选型 |
|------|----------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 数据库 | SQLite + better-sqlite3 |
| 拖拽 | @dnd-kit/core |
| 日期 | date-fns |
| Session | iron-session |

## 数据模型

### users（人员表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 姓名 |
| sort_order | INTEGER | 排班顺序 |
| created_at | DATETIME | 创建时间 |

### schedules（排班表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| date | TEXT | 日期 YYYY-MM-DD，唯一 |
| user_id | INTEGER | 值班人员ID，外键 |
| is_manual | INTEGER | 是否手动调整（0/1） |
| created_at | DATETIME | 创建时间 |

### logs（操作日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| action | TEXT | 操作类型 |
| target | TEXT | 操作对象 |
| old_value | TEXT | 修改前的值 |
| new_value | TEXT | 修改后的值 |
| created_at | DATETIME | 创建时间 |

### config（系统配置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| key | TEXT | 配置键，主键 |
| value | TEXT | 配置值 |

## 页面结构

```
/ (首页)
├── 登录页（未登录时显示）

/dashboard（主页面）
├── 顶部导航栏
│   ├── 视图切换（月历/列表）
│   ├── 统计按钮
│   ├── 日志按钮
│   └── 退出登录
│
├── 左侧面板
│   ├── 人员管理（可拖拽排序）
│   └── 排班生成（日期区间选择）
│
└── 右侧主区域
    ├── 月历视图
    └── 列表视图
```

## 核心功能

### 1. 登录验证

- 简单密码模式，所有人共享一个密码
- 使用 iron-session 管理 Session
- 未登录自动跳转登录页

### 2. 人员管理

- 添加/删除人员
- 拖拽调整排班顺序
- sort_order 决定自动排班顺序

### 3. 自动排班

- 选择日期区间（开始日期、结束日期）
- 按 sort_order 顺序循环分配
- 保留已手动调整的记录（is_manual = 1）

### 4. 手动调整

- **替换**：点击日期，选择新人员
- **交换**：拖拽日期A到日期B，交换两人
- 调整后标记 is_manual = 1

### 5. 统计功能

- 每人值班总次数
- 按月/周分组统计
- 最多/最少值班者对比

### 6. 操作日志

- 记录所有操作（登录、配置、排班生成、调整）
- 记录修改前后的值
- 按时间倒序展示

## UI 设计

- 主色调：蓝色系（shadcn 默认主题）
- 左侧面板：280px 固定宽度
- 响应式设计：小屏幕可收起左侧面板
- 交互反馈：Toast 提示、确认对话框

## 目录结构

```
scheduling/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   └── actions/           # Server Actions
│   ├── components/
│   │   ├── ui/                # shadcn 组件
│   │   ├── LoginForm.tsx
│   │   ├── UserList.tsx
│   │   ├── CalendarView.tsx
│   │   ├── ListView.tsx
│   │   ├── ScheduleCell.tsx
│   │   ├── UserSelectDialog.tsx
│   │   ├── StatisticsDialog.tsx
│   │   └── LogDialog.tsx
│   ├── lib/
│   │   ├── db.ts              # SQLite 操作
│   │   ├── auth.ts            # 登录验证
│   │   └── schedule.ts        # 排班逻辑
│   └── types/
│       └── index.ts           # 类型定义
├── data/
│   └── scheduling.db
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

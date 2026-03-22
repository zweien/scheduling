# 值班领导功能设计

## 概述

为值班排班系统增加"值班领导"角色，每天除了值班员外，还会有一个值班领导。值班领导是独立的人员组，有全局默认值，特定日期可手动覆盖。

## 需求总结

| 项目 | 说明 |
|------|------|
| 值班领导人员 | 独立于值班员的单独列表，2-5人 |
| 排班规则 | 全局设置一个默认领导，特定日期可手动覆盖 |
| 视图模式 | 三种：只看值班员 / 只看值班领导 / 同时显示 |
| 管理入口 | 在现有人员管理页面添加值班领导管理 |
| API 支持 | 提供值班领导和值班领导排班的 REST API |

## 数据库设计

### 新增表

#### `leaders` 表 - 值班领导列表

```sql
CREATE TABLE leaders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `leader_schedules` 表 - 每日值班领导

```sql
CREATE TABLE leader_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  leader_id INTEGER NOT NULL,
  is_manual INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id) REFERENCES leaders(id) ON DELETE CASCADE
);
```

> **注意**：使用 `ON DELETE CASCADE`，当领导被删除时，相关排班记录一并删除。

### 配置项

在 `config` 表新增：
- `default_leader_id` - 默认值班领导的 ID

### 迁移版本

新增迁移版本号：`008_duty_leaders`

## 用户界面设计

### 人员管理页面

使用 Tab 切换：「值班人员」和「值班领导」两个标签页。

```
┌─────────────────────────────────────┐
│  [值班人员]  [值班领导]              │
├─────────────────────────────────────┤
│  + 添加人员                          │
│  ┌─────────────────────────────┐    │
│  │ 张三  [编辑] [禁用]          │    │
│  │ 李四  [编辑] [禁用]          │    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

两个 Tab 的功能完全一致：增删改、拖拽排序、启用/禁用。

### 月历视图

**视图模式切换按钮**

在月历视图工具栏添加切换按钮组：

```
┌─────────────────────────────────────────────────┐
│  值班日历                    [值班员|领导|全部]  │
├─────────────────────────────────────────────────┤
│  [上月] [今天] [下月]                            │
└─────────────────────────────────────────────────┘
```

**三种视图的日历格子显示**

| 视图 | 格子内容 |
|------|----------|
| 值班员 | 现有样式，显示值班员头像/姓名 |
| 值班领导 | 同样样式，显示值班领导头像/姓名 |
| 全部 | 上方显示值班员，下方显示值班领导（小字号，纯文字） |

**「全部」视图示意**

```
┌──────────┐
│     15   │
│  [张三]  │  ← 值班员（正常大小，头像或姓名）
│  王局    │  ← 值班领导（下方，小字号，纯文字）
└──────────┘
```

### 设置页面

在系统设置页面添加「默认值班领导」下拉选择框：

```
┌─────────────────────────────────────┐
│  系统设置                            │
├─────────────────────────────────────┤
│  默认值班领导：[王局 ▼]              │
│  （从启用状态的值班领导中选择）       │
└─────────────────────────────────────┘
```

> **注意**：下拉框只显示 `is_active = 1` 的领导。

## 业务逻辑

### 自动填充

当生成排班时（自动排班或手动添加某天），系统自动用「默认值班领导」填充 `leader_schedules` 表。

### 手动调整

与值班员类似，点击日历格子可以：
- 替换当天的值班领导
- 删除当天的值班领导（恢复为默认值）

### 边界情况处理

#### 删除值班领导

1. 删除领导时，使用 `ON DELETE CASCADE` 自动删除相关排班记录
2. 如果被删除的领导是默认领导，清除 `default_leader_id` 配置

#### 禁用值班领导

1. 禁用领导不影响已有的排班记录
2. 设置页面的默认领导下拉框只显示启用状态的领导
3. 如果当前默认领导被禁用，设置页面显示警告提示

#### 无默认领导时

1. 自动排班时如果没有设置默认领导，跳过值班领导填充（不报错）
2. 月历视图在「全部」模式下，值班领导位置显示为空

## 权限控制

值班领导相关操作使用与值班员相同的 `canManage` 权限：
- 值班领导的增删改需要 `canManage = true`
- 值班领导排班的手动调整需要 `canManage = true`

## 日志记录

在 `logs` 表记录值班领导相关操作，新增 Action 类型：

```typescript
| 'add_leader'
| 'delete_leader'
| 'reorder_leaders'
| 'toggle_leader_active'
| 'replace_leader_schedule'
| 'delete_leader_schedule'
| 'set_default_leader'
```

## API 设计

### REST API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/leaders` | GET | 获取值班领导列表 |
| `/api/leader-schedules` | GET | 按日期范围获取值班领导排班 |
| `/api/leader-schedules/[date]` | PATCH | 修改某天的值班领导 |

### 响应格式

**GET /api/leaders**

```json
[
  { "id": 1, "name": "王局", "isActive": true },
  { "id": 2, "name": "李处", "isActive": true }
]
```

**GET /api/leader-schedules?start=2026-03-01&end=2026-03-31**

```json
[
  { "id": 1, "date": "2026-03-01", "isManual": false, "leader": { "id": 1, "name": "王局" } },
  { "id": 2, "date": "2026-03-02", "isManual": true, "leader": { "id": 2, "name": "李处" } }
]
```

**PATCH /api/leader-schedules/2026-03-01**

```json
// Request
{ "leaderId": 2 }

// Response
{ "id": 1, "date": "2026-03-01", "isManual": true, "leader": { "id": 2, "name": "李处" } }
```

## 实现范围

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/lib/leaders.ts` | 值班领导 CRUD 操作 |
| `src/lib/leader-schedules.ts` | 值班领导排班 CRUD |
| `src/app/actions/leaders.ts` | 值班领导 Server Actions |
| `src/app/actions/leader-schedules.ts` | 值班领导排班 Server Actions |
| `src/hooks/useLeaders.ts` | 值班领导数据查询 hook |
| `src/hooks/useLeaderSchedules.ts` | 值班领导排班数据 hook |
| `src/hooks/useInvalidateLeaderSchedules.ts` | 值班领导排班缓存失效 hook |
| `src/components/LeaderManagement.tsx` | 值班领导管理组件 |
| `src/app/api/leaders/route.ts` | GET 值班领导列表 API |
| `src/app/api/leader-schedules/route.ts` | GET 值班领导排班 API |
| `src/app/api/leader-schedules/[date]/route.ts` | PATCH 修改值班领导 API |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/lib/db/migrations.ts` | 添加 `008_duty_leaders` 迁移 |
| `src/types/index.ts` | 添加 Leader、LeaderSchedule、Action 类型 |
| `src/components/DutyUserManagement.tsx` | 添加 Tab 切换，集成 LeaderManagement 组件 |
| `src/components/CalendarView.tsx` | 添加三种视图切换逻辑 |
| `src/components/CalendarCell.tsx` | 支持「全部」视图的双行显示 |
| `src/app/actions/schedule.ts` | 自动排班时同步生成值班领导 |
| 设置页面组件 | 添加默认值班领导配置 |

## 实现步骤

1. **数据库迁移** - 新增 `leaders` 和 `leader_schedules` 表（迁移版本 008）
2. **后端逻辑** - CRUD 函数
3. **Server Actions** - 值班领导和值班领导排班的 Server Actions
4. **API 路由** - REST API
5. **React Query Hooks** - 数据查询和缓存失效
6. **人员管理界面** - Tab 切换 + 值班领导管理
7. **设置页面** - 默认值班领导配置
8. **月历视图** - 三种视图切换 + 双行显示
9. **自动排班逻辑** - 同步生成值班领导

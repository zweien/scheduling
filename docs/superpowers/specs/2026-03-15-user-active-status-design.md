# 人员参与状态功能设计

## 概述

为人员管理增加"是否参与值班"状态，使自动排班只对参与值班的人员进行分配，并支持不填结束日期时按参与人数排一轮。

## 需求

1. 人员增加"是否参与值班"状态字段
2. 自动排班只排参与值班的人员
3. 生成排班时结束日期可选（不填时从开始日期排 N 天，N = 参与人数）
4. 状态切换使用开关按钮
5. 新增人员默认参与值班

## 技术设计

### 1. 数据库变更

在 `users` 表增加字段：

```sql
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1
```

- `is_active = 1`：参与值班
- `is_active = 0`：不参与值班

**迁移策略**：已有数据的 `is_active` 默认为 1，无需手动迁移。

### 2. 类型定义

**`src/types/index.ts`**

```typescript
export interface User {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;  // 新增
  created_at: string;
}

// 更新 Action 类型
export type Action =
  | 'login'
  | 'logout'
  | 'add_user'
  | 'delete_user'
  | 'reorder_users'
  | 'toggle_user_active'  // 新增
  | 'generate_schedule'
  | 'replace_schedule'
  | 'swap_schedule'
  | 'set_password';
```

### 3. 后端改动

**`src/lib/db.ts`**

表初始化语句增加 `is_active` 字段（新数据库自动包含）。

**`src/lib/users.ts`**

- 新增 `getActiveUsers()` — 只获取 `is_active = 1` 的用户，按 `sort_order` 排序
- 修改 `createUser()` — 显式设置 `is_active = 1`
- 新增 `setUserActive(id: number, is_active: boolean)` — 切换用户状态

**`src/lib/schedule.ts`**

修改 `generateSchedule(startDate: string, endDate?: string)`：

- 参数 `endDate` 改为可选
- 使用 `getActiveUsers()` 替代 `getAllUsers()`
- 无结束日期时：计算参与人数 N，生成从开始日期起的 N 天排班

```typescript
export function generateSchedule(startDate: string, endDate?: string) {
  const users = getActiveUsers();
  if (users.length === 0) {
    throw new Error('没有参与值班的人员');
  }

  const start = parseISO(startDate);
  // 如果没有结束日期，只排一轮（参与人数 = 天数）
  const end = endDate ? parseISO(endDate) : addDays(start, users.length - 1);
  const days = eachDayOfInterval({ start, end });

  // ... 其余逻辑不变
}
```

**`src/app/actions/users.ts`**

新增 Server Action：`updateUserActive(id: number, is_active: boolean)`

**`src/app/actions/schedule.ts`**

修改 `generateScheduleAction` 参数：`endDate` 改为可选。

### 4. 前端改动

**`src/components/UserList.tsx`**

每个人员行增加 Switch 开关：

```
[拖拽] [姓名]          [开关] [删除]
```

- 开关状态绑定 `user.is_active`
- 切换时调用 `updateUserActive`
- 不参与值班的人员用灰色或透明度区分

**`src/components/ScheduleGenerator.tsx`**

- 结束日期输入框增加 `required={false}`
- 不填结束日期时，显示提示："将排 {activeUserCount} 天"
- 修改提交逻辑：`endDate` 可为空字符串

### 5. 边界情况

| 场景 | 处理 |
|------|------|
| 所有人员都不参与 | 生成排班时报错："没有参与值班的人员" |
| 只有一人参与 | 正常排班，所有日期都是该人 |
| 结束日期早于开始日期 | 保持原有校验，报错 |
| 结束日期不填且参与人数为 0 | 报错："没有参与值班的人员" |
| 用户被设为"不参与"但已有排班记录 | 保留历史记录，仅影响新生成的排班 |
| 用户切换状态后已有的自动排班 | 不变，保持 `is_manual` 语义（手动调整的保留，自动生成的可被覆盖） |

### 6. 日志记录

用户状态变更记录到 `logs` 表：

```typescript
addLog('toggle_user_active', `人员: ${name}`, oldValue, newValue);
```

## 实现顺序

1. **数据库迁移**
   - 在 `db.ts` 表初始化语句中添加 `is_active` 字段（新数据库自动包含）
   - 对已存在的数据库执行 `ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`
2. **类型定义** — 更新 `User` 接口和 `Action` 类型
3. **后端逻辑** — 修改 `users.ts`（新增 `getActiveUsers`、`setUserActive`）
4. **排班逻辑** — 修改 `schedule.ts` 支持 `endDate` 可选
5. **Server Actions** — 新增 `updateUserActive`，修改 `generateScheduleAction`
6. **前端 UI** — 修改 `UserList.tsx` 添加开关
7. **前端 UI** — 修改 `ScheduleGenerator.tsx` 结束日期可选
8. **测试** — 验证各功能正常

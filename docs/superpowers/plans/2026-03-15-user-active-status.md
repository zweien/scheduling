# 人员参与状态功能实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为人员管理增加"是否参与值班"状态，使自动排班只对参与值班的人员进行分配，并支持不填结束日期时按参与人数排一轮。

**Architecture:** 在 users 表增加 is_active 字段，后端新增 getActiveUsers/setUserActive 函数，前端 UserList 组件添加 Switch 开关，ScheduleGenerator 支持结束日期可选。

**Tech Stack:** Next.js 16, TypeScript, SQLite, better-sqlite3, shadcn/ui, date-fns

---

## Chunk 1: 数据库和类型定义

### Task 1: 数据库迁移

**Files:**
- Modify: `src/lib/db.ts:12-18`

- [ ] **Step 1: 修改 db.ts 表初始化语句，添加 is_active 字段**

在 users 表定义中添加 `is_active INTEGER DEFAULT 1`：

```typescript
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: 对已存在的数据库执行迁移**

在 db.ts 的初始化代码后添加迁移逻辑（在 export default db 之前）：

```typescript
// 检查并添加 is_active 字段（兼容已存在的数据库）
try {
  db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
} catch {
  // 字段已存在，忽略错误
}
```

- [ ] **Step 3: 验证数据库迁移成功**

```bash
bun dev
# 启动成功后 Ctrl+C 退出
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add is_active column to users table"
```

### Task 2: 类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 更新 User 接口**

在 User 接口中添加 is_active 字段：

```typescript
export interface User {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
```

- [ ] **Step 2: 更新 Action 类型**

在 Action 类型中添加 toggle_user_active：

```typescript
export type Action =
  | 'login'
  | 'logout'
  | 'add_user'
  | 'delete_user'
  | 'reorder_users'
  | 'toggle_user_active'
  | 'generate_schedule'
  | 'replace_schedule'
  | 'swap_schedule'
  | 'set_password';
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add is_active to User type and toggle_user_active to Action"
```

---

## Chunk 2: 后端逻辑

### Task 3: 用户库函数

**Files:**
- Modify: `src/lib/users.ts`

- [ ] **Step 1: 添加 getActiveUsers 函数**

在 getAllUsers 函数后添加：

```typescript
export function getActiveUsers(): User[] {
  return db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY sort_order').all() as User[];
}
```

- [ ] **Step 2: 添加 setUserActive 函数**

在文件末尾添加：

```typescript
export function setUserActive(id: number, isActive: boolean): void {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}
```

- [ ] **Step 3: 修改 createUser 函数显式设置 is_active**

将 INSERT 语句修改为：

```typescript
const result = db.prepare('INSERT INTO users (name, sort_order, is_active) VALUES (?, ?, 1)').run(name, sortOrder);
```

- [ ] **Step 4: 验证编译通过**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/users.ts
git commit -m "feat: add getActiveUsers and setUserActive functions"
```

### Task 4: 排班逻辑

**Files:**
- Modify: `src/lib/schedule.ts`

- [ ] **Step 1: 修改 import 语句**

添加 getActiveUsers 和 addDays：

```typescript
import { getActiveUsers } from './users';
import { setSchedule, getSchedulesByDateRange } from './schedules';
import { addLog } from './logs';
import { format, eachDayOfInterval, parseISO, addDays } from 'date-fns';
```

- [ ] **Step 2: 修改 generateSchedule 函数**

完整替换为：

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

  const endDateStr = endDate || format(end, 'yyyy-MM-dd');

  // 获取已有手动调整的日期
  const existingSchedules = getSchedulesByDateRange(startDate, endDateStr);
  const manualDates = new Set(
    existingSchedules.filter(s => s.is_manual).map(s => s.date)
  );

  let userIndex = 0;
  const assigned: string[] = [];

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');

    // 跳过已手动调整的日期
    if (manualDates.has(dateStr)) {
      return;
    }

    const user = users[userIndex % users.length];
    setSchedule(dateStr, user.id, false);
    assigned.push(`${dateStr}: ${user.name}`);
    userIndex++;
  });

  addLog('generate_schedule', `日期: ${startDate} ~ ${endDateStr}`, undefined, assigned.join(', '));
}
```

- [ ] **Step 3: 验证编译通过**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/schedule.ts
git commit -m "feat: support optional endDate and use active users only"
```

### Task 5: Server Actions

**Files:**
- Modify: `src/app/actions/users.ts`
- Modify: `src/app/actions/schedule.ts`

- [ ] **Step 1: 在 users.ts 添加 import**

```typescript
import { getAllUsers, createUser, deleteUser, reorderUsers, setUserActive, getUserById } from '@/lib/users';
```

- [ ] **Step 2: 在 users.ts 添加 updateUserActiveAction**

在文件末尾添加：

```typescript
export async function updateUserActiveAction(id: number, isActive: boolean) {
  const user = getUserById(id);
  if (!user) return;

  setUserActive(id, isActive);
  // isActive 是新状态：true=参与，false=不参与
  addLog('toggle_user_active', `人员: ${user.name}`, isActive ? '不参与' : '参与', isActive ? '参与' : '不参与');
  revalidatePath('/dashboard');
}
```

- [ ] **Step 3: 修改 schedule.ts 的 generateScheduleAction**

将函数签名改为：

```typescript
export async function generateScheduleAction(startDate: string, endDate?: string) {
  try {
    doGenerateSchedule(startDate, endDate);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
```

- [ ] **Step 4: 验证编译通过**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/users.ts src/app/actions/schedule.ts
git commit -m "feat: add updateUserActiveAction and make endDate optional"
```

---

## Chunk 3: 前端 UI

### Task 6: 添加 Switch 组件

**Files:**
- Create: `src/components/ui/switch.tsx`

- [ ] **Step 1: 使用 shadcn 添加 Switch 组件**

```bash
npx shadcn@latest add switch
```

如果提示确认，输入 `y`。

- [ ] **Step 2: 验证组件已创建**

确认 `src/components/ui/switch.tsx` 文件存在。

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/switch.tsx
git commit -m "feat: add shadcn switch component"
```

### Task 7: 修改 UserList 组件

**Files:**
- Modify: `src/components/UserList.tsx`

- [ ] **Step 1: 添加 import**

```typescript
import { Switch } from '@/components/ui/switch';
import { getUsers, addUser, removeUser, updateUserOrder, updateUserActiveAction } from '@/app/actions/users';
```

- [ ] **Step 2: 修改 SortableItem 组件**

完整替换 SortableItem 函数：

```typescript
function SortableItem({
  user,
  onDelete,
  onToggleActive
}: {
  user: User;
  onDelete: (id: number, name: string) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}
      className={`flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted group ${!user.is_active ? 'opacity-50' : ''}`}>
      <span className="text-sm cursor-move flex-1" {...listeners}>{user.name}</span>
      <div className="flex items-center gap-2">
        <Switch
          checked={user.is_active}
          onCheckedChange={(checked) => onToggleActive(user.id, checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(user.id, user.name);
          }}
          className="h-6 w-6 p-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 添加 handleToggleActive 函数**

在 UserList 组件中，handleDelete 函数后添加：

```typescript
async function handleToggleActive(id: number, isActive: boolean) {
  await updateUserActiveAction(id, isActive);
  setUsers(users.map(u => u.id === id ? { ...u, is_active: isActive } : u));
}
```

- [ ] **Step 4: 更新 SortableItem 调用**

在 map 调用中添加 onToggleActive prop：

```typescript
users.map(user => (
  <SortableItem key={user.id} user={user} onDelete={handleDelete} onToggleActive={handleToggleActive} />
))
```

- [ ] **Step 5: 验证编译通过**

```bash
bun run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/UserList.tsx
git commit -m "feat: add active status toggle to user list"
```

### Task 8: 修改 ScheduleGenerator 组件

**Files:**
- Modify: `src/components/ScheduleGenerator.tsx`

- [ ] **Step 1: 添加 import 和状态**

修改组件开头：

```typescript
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateScheduleAction } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';

export function ScheduleGenerator({ onGenerated }: ScheduleGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUserCount, setActiveUserCount] = useState(0);

  useEffect(() => {
    getUsers().then(users => {
      setActiveUserCount(users.filter(u => u.is_active).length);
    });
  }, []);
```

- [ ] **Step 2: 修改 handleGenerate 函数**

完整替换：

```typescript
async function handleGenerate() {
  if (!startDate) {
    setError('请选择开始日期');
    return;
  }

  if (endDate && startDate > endDate) {
    setError('开始日期不能晚于结束日期');
    return;
  }

  setLoading(true);
  setError(null);

  const result = await generateScheduleAction(startDate, endDate || undefined);

  if (result.success) {
    onGenerated();
  } else {
    setError(result.error ?? '生成失败');
  }

  setLoading(false);
}
```

- [ ] **Step 3: 修改结束日期输入区域**

替换结束日期的 div 为：

```typescript
<div className="space-y-1">
  <Label htmlFor="endDate" className="text-xs">结束日期（可选）</Label>
  <Input
    id="endDate"
    type="date"
    value={endDate}
    onChange={e => setEndDate(e.target.value)}
    className="h-8"
  />
  {!endDate && activeUserCount > 0 && (
    <p className="text-xs text-muted-foreground">不填将排 {activeUserCount} 天</p>
  )}
</div>
```

- [ ] **Step 4: 验证编译通过**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ScheduleGenerator.tsx
git commit -m "feat: make endDate optional and show active user count hint"
```

---

## Chunk 4: 测试和验证

### Task 9: 手动测试

- [ ] **Step 1: 启动开发服务器**

```bash
bun dev
```

- [ ] **Step 2: 测试人员状态切换**

1. 打开 http://localhost:3000
2. 登录后查看人员列表
3. 点击 Switch 开关切换人员状态
4. 验证不参与的人员显示为灰色

- [ ] **Step 3: 测试自动排班**

1. 将部分人员设为不参与
2. 填写开始日期，不填结束日期
3. 点击"生成排班"
4. 验证只排了参与人员，天数等于参与人数
5. 验证每个参与人员各排一天

- [ ] **Step 4: 测试边界情况**

1. 将所有人员设为不参与
2. 尝试生成排班
3. 验证显示错误"没有参与值班的人员"

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete user active status feature"
```

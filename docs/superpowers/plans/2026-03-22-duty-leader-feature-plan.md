# 值班领导功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为值班排班系统添加值班领导角色，支持独立的人员管理、三种视图模式切换、默认值班领导配置。

**Architecture:** 新建独立的 `leaders` 和 `leader_schedules` 表，复用现有 CRUD/Server Action/API/Hook 模式，修改月历视图支持三种显示模式。

**Tech Stack:** Next.js 16 App Router, SQLite + better-sqlite3, Server Actions, TanStack Query, shadcn/ui

---

## Task 1: 数据库迁移 - 新增值班领导相关表

**Files:**
- Modify: `src/lib/db/migrations.ts`

- [ ] **Step 1: 添加迁移版本 008_duty_leaders**

在 `MIGRATIONS` 数组末尾添加新迁移：

```typescript
{
  version: '008_duty_leaders',
  up(database) {
    // 创建 leaders 表
    database.exec(`
      CREATE TABLE IF NOT EXISTS leaders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建 leader_schedules 表
    database.exec(`
      CREATE TABLE IF NOT EXISTS leader_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        leader_id INTEGER NOT NULL,
        is_manual INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leader_id) REFERENCES leaders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_leader_schedules_date ON leader_schedules(date);
    `);

    // 添加默认值班领导配置项
    database.prepare(`
      INSERT OR IGNORE INTO config (key, value) VALUES ('default_leader_id', '')
    `).run();
  },
},
```

- [ ] **Step 2: 验证迁移**

运行: `bun dev`
预期: 服务器正常启动，无迁移错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/db/migrations.ts
git commit -m "feat(db): 添加 leaders 和 leader_schedules 表迁移

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 类型定义 - 添加值班领导相关类型

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 添加 Leader 和 LeaderSchedule 类型**

在文件末尾添加：

```typescript
export interface Leader {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LeaderSchedule {
  id: number;
  date: string;
  leader_id: number;
  is_manual: boolean;
  created_at: string;
}

export interface LeaderScheduleWithLeader extends LeaderSchedule {
  leader: Leader;
}
```

- [ ] **Step 2: 扩展 Action 类型**

在 `Action` 类型末尾（`| 'create_token'` 后）添加：

```typescript
  | 'add_leader'
  | 'delete_leader'
  | 'reorder_leaders'
  | 'toggle_leader_active'
  | 'replace_leader_schedule'
  | 'delete_leader_schedule'
  | 'set_default_leader';
```

- [ ] **Step 3: 提交**

```bash
git add src/types/index.ts
git commit -m "feat(types): 添加 Leader、LeaderSchedule 类型和相关 Action

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 后端逻辑 - 值班领导 CRUD

**Files:**
- Create: `src/lib/leaders.ts`

- [ ] **Step 1: 创建 leaders.ts**

```typescript
// src/lib/leaders.ts
import db from './db';
import type { Leader } from '@/types';

export function getAllLeaders(): Leader[] {
  return db.prepare('SELECT * FROM leaders ORDER BY sort_order').all() as Leader[];
}

export function getActiveLeaders(): Leader[] {
  return db.prepare('SELECT * FROM leaders WHERE is_active = 1 ORDER BY sort_order').all() as Leader[];
}

export function getLeaderById(id: number): Leader | undefined {
  return db.prepare('SELECT * FROM leaders WHERE id = ?').get(id) as Leader | undefined;
}

export function getLeaderByName(name: string): Leader | undefined {
  return db.prepare('SELECT * FROM leaders WHERE name = ?').get(name.trim()) as Leader | undefined;
}

export function createLeader(name: string): Leader {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM leaders').get() as { max: number | null };
  const sortOrder = (maxOrder?.max ?? 0) + 1;
  const result = db.prepare(`
    INSERT INTO leaders (name, sort_order, is_active)
    VALUES (?, ?, 1)
  `).run(name.trim(), sortOrder);
  return getLeaderById(result.lastInsertRowid as number)!;
}

export function deleteLeader(id: number): void {
  const transaction = db.transaction(() => {
    // 先删除该领导的所有排班记录
    db.prepare('DELETE FROM leader_schedules WHERE leader_id = ?').run(id);
    // 清除默认领导配置（如果被删除的是默认领导）
    db.prepare("UPDATE config SET value = '' WHERE key = 'default_leader_id' AND value = ?").run(String(id));
    // 再删除领导
    db.prepare('DELETE FROM leaders WHERE id = ?').run(id);
  });
  transaction();
}

export function reorderLeaders(leaderIds: number[]): void {
  const update = db.prepare('UPDATE leaders SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    leaderIds.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  transaction();
}

export function setLeaderActive(id: number, isActive: boolean): void {
  db.prepare('UPDATE leaders SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

export function getLeaderScheduleCount(id: number): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM leader_schedules WHERE leader_id = ?').get(id) as { count: number };
  return result.count;
}
```

- [ ] **Step 2: 验证编译**

运行: `bun run build`
预期: 编译成功，无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/leaders.ts
git commit -m "feat(lib): 添加值班领导 CRUD 操作

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 后端逻辑 - 值班领导排班 CRUD

**Files:**
- Create: `src/lib/leader-schedules.ts`

- [ ] **Step 1: 创建 leader-schedules.ts**

```typescript
// src/lib/leader-schedules.ts
import db from './db';
import type { LeaderSchedule, LeaderScheduleWithLeader } from '@/types';
import { getLeaderById } from './leaders';

export function getLeaderScheduleByDate(date: string): LeaderScheduleWithLeader | undefined {
  const schedule = db.prepare('SELECT * FROM leader_schedules WHERE date = ?').get(date) as LeaderSchedule | undefined;
  if (!schedule) return undefined;
  const leader = getLeaderById(schedule.leader_id);
  if (!leader) return undefined;
  return {
    ...schedule,
    is_manual: Boolean(schedule.is_manual),
    leader,
  };
}

export function getLeaderSchedulesByDateRange(startDate: string, endDate: string): LeaderScheduleWithLeader[] {
  const schedules = db.prepare(
    'SELECT * FROM leader_schedules WHERE date >= ? AND date <= ? ORDER BY date'
  ).all(startDate, endDate) as LeaderSchedule[];
  return schedules.map(s => ({
    ...s,
    is_manual: Boolean(s.is_manual),
    leader: getLeaderById(s.leader_id)!,
  })).filter(s => s.leader);
}

export function getLeaderSchedulesByDates(dates: string[]): LeaderScheduleWithLeader[] {
  if (dates.length === 0) {
    return [];
  }

  const placeholders = dates.map(() => '?').join(', ');
  const schedules = db.prepare(
    `SELECT * FROM leader_schedules WHERE date IN (${placeholders}) ORDER BY date`
  ).all(...dates) as LeaderSchedule[];

  return schedules.map(schedule => ({
    ...schedule,
    is_manual: Boolean(schedule.is_manual),
    leader: getLeaderById(schedule.leader_id)!,
  })).filter(schedule => schedule.leader);
}

export function setLeaderSchedule(date: string, leaderId: number, isManual: boolean = false): void {
  db.prepare(`
    INSERT INTO leader_schedules (date, leader_id, is_manual)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      leader_id = excluded.leader_id,
      is_manual = excluded.is_manual
  `).run(date, leaderId, isManual ? 1 : 0);
}

export function deleteLeaderSchedule(date: string): void {
  db.prepare('DELETE FROM leader_schedules WHERE date = ?').run(date);
}

export function getDefaultLeaderId(): number | null {
  const result = db.prepare("SELECT value FROM config WHERE key = 'default_leader_id'").get() as { value: string } | undefined;
  const id = result?.value ? parseInt(result.value, 10) : null;
  return id && !isNaN(id) ? id : null;
}

export function setDefaultLeaderId(id: number | null): void {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('default_leader_id', ?)").run(id ? String(id) : '');
}
```

- [ ] **Step 2: 验证编译**

运行: `bun run build`
预期: 编译成功，无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/leader-schedules.ts
git commit -m "feat(lib): 添加值班领导排班 CRUD 操作

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Server Actions - 值班领导管理

**Files:**
- Create: `src/app/actions/leaders.ts`

- [ ] **Step 1: 创建 leaders Server Actions**

```typescript
// src/app/actions/leaders.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import {
  createLeader as doCreateLeader,
  deleteLeader as doDeleteLeader,
  getAllLeaders,
  getLeaderScheduleCount,
  reorderLeaders as doReorderLeaders,
  setLeaderActive as doSetLeaderActive,
} from '@/lib/leaders';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function getLeaders() {
  return getAllLeaders();
}

export async function createLeader(name: string) {
  const account = await requireAdmin();

  const leader = doCreateLeader(name);
  await addWebLog('add_leader', `领导: ${leader.name}`, undefined, '已添加', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, leader };
}

export async function deleteLeaderAction(id: number) {
  const account = await requireAdmin();

  const scheduleCount = getLeaderScheduleCount(id);
  const leaders = getAllLeaders();
  const leader = leaders.find(l => l.id === id);

  doDeleteLeader(id);

  await addWebLog('delete_leader', `领导: ${leader?.name ?? id}`, `${scheduleCount} 条排班`, '已删除', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, deletedScheduleCount: scheduleCount };
}

export async function reorderLeadersAction(leaderIds: number[]) {
  const account = await requireAdmin();

  doReorderLeaders(leaderIds);
  await addWebLog('reorder_leaders', '调整值班领导顺序', undefined, '已完成', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function toggleLeaderActiveAction(id: number, isActive: boolean) {
  const account = await requireAdmin();

  doSetLeaderActive(id, isActive);
  await addWebLog('toggle_leader_active', `领导 ID: ${id}`, isActive ? '禁用' : '启用', isActive ? '启用' : '禁用', {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function getLeaderScheduleCountAction(id: number) {
  await requireAdmin();
  return getLeaderScheduleCount(id);
}
```

- [ ] **Step 2: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/app/actions/leaders.ts
git commit -m "feat(actions): 添加值班领导管理 Server Actions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Server Actions - 值班领导排班管理

**Files:**
- Create: `src/app/actions/leader-schedules.ts`

- [ ] **Step 1: 创建 leader-schedules Server Actions**

```typescript
// src/app/actions/leader-schedules.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';
import {
  getLeaderSchedulesByDateRange,
  setLeaderSchedule,
  deleteLeaderSchedule,
  getDefaultLeaderId,
  setDefaultLeaderId,
} from '@/lib/leader-schedules';
import { getLeaderById, getAllLeaders } from '@/lib/leaders';

export async function getLeaderSchedules(startDate: string, endDate: string) {
  return getLeaderSchedulesByDateRange(startDate, endDate);
}

export async function replaceLeaderSchedule(date: string, leaderId: number) {
  const account = await requireAdmin();
  const previous = getLeaderSchedulesByDateRange(date, date)[0];
  const oldLeader = previous ? getLeaderById(previous.leader_id) : null;
  const newLeader = getLeaderById(leaderId);

  if (!newLeader) {
    return { success: false, error: '找不到目标值班领导' };
  }

  setLeaderSchedule(date, leaderId, true);

  await addWebLog(
    'replace_leader_schedule',
    `日期: ${date}`,
    oldLeader?.name ?? '无',
    newLeader.name,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function removeLeaderSchedule(date: string) {
  const account = await requireAdmin();
  const schedules = getLeaderSchedulesByDateRange(date, date);
  const current = schedules[0];

  if (!current) {
    return { success: false, error: '找不到值班领导排班记录' };
  }

  deleteLeaderSchedule(date);
  await addWebLog(
    'delete_leader_schedule',
    `日期: ${date}`,
    current.leader.name,
    '已删除',
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getDefaultLeader() {
  const id = getDefaultLeaderId();
  return id ? getLeaderById(id) : null;
}

export async function setDefaultLeaderAction(leaderId: number | null) {
  const account = await requireAdmin();

  const previousId = getDefaultLeaderId();
  const previousLeader = previousId ? getLeaderById(previousId) : null;
  const newLeader = leaderId ? getLeaderById(leaderId) : null;

  setDefaultLeaderId(leaderId);

  await addWebLog(
    'set_default_leader',
    '默认值班领导',
    previousLeader?.name ?? '无',
    newLeader?.name ?? '无',
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function getLeadersForSelect() {
  return getAllLeaders();
}
```

- [ ] **Step 2: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/app/actions/leader-schedules.ts
git commit -m "feat(actions): 添加值班领导排班 Server Actions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 修改自动排班逻辑 - 同步生成值班领导

**Files:**
- Modify: `src/app/actions/schedule.ts`
- Modify: `src/lib/schedule.ts`

- [ ] **Step 1: 读取 schedule.ts 了解自动排班逻辑**

运行: 确认理解 `generateScheduleFromDate` 函数的实现

- [ ] **Step 2: 在 schedule.ts 中导入值班领导相关函数**

在文件顶部添加导入：

```typescript
import { getDefaultLeaderId } from './leader-schedules';
import { setLeaderSchedule } from './leader-schedules';
```

- [ ] **Step 3: 修改 generateScheduleFromDate 函数**

在生成排班的循环中，添加值班领导填充逻辑：

```typescript
// 在 setSchedule 调用后添加
const defaultLeaderId = getDefaultLeaderId();
if (defaultLeaderId) {
  setLeaderSchedule(dateStr, defaultLeaderId, false);
}
```

- [ ] **Step 4: 修改 autoScheduleFromDateAction**

确保在 Server Action 中也处理缓存失效：

```typescript
// 在 revalidatePath('/dashboard') 前添加注释说明
// 值班领导数据也会在页面重新加载时获取
```

- [ ] **Step 5: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 6: 提交**

```bash
git add src/lib/schedule.ts src/app/actions/schedule.ts
git commit -m "feat(schedule): 自动排班时同步生成值班领导

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: REST API - 值班领导列表

**Files:**
- Create: `src/app/api/leaders/route.ts`

- [ ] **Step 1: 创建 API 路由**

```typescript
// src/app/api/leaders/route.ts
import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { getAllLeaders } from '@/lib/leaders';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!authenticateApiRequest(null as any)) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }

  // 注意：实际使用时需要从 request 获取认证信息
  const leaders = getAllLeaders().map(leader => ({
    id: leader.id,
    name: leader.name,
    isActive: Boolean(leader.is_active),
  }));

  return NextResponse.json(leaders);
}
```

- [ ] **Step 2: 修复认证逻辑**

参考 `/api/schedules/route.ts` 的认证模式，修正认证调用。

- [ ] **Step 3: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 4: 提交**

```bash
git add src/app/api/leaders/route.ts
git commit -m "feat(api): 添加 GET /api/leaders 接口

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: REST API - 值班领导排班

**Files:**
- Create: `src/app/api/leader-schedules/route.ts`
- Create: `src/app/api/leader-schedules/[date]/route.ts`

- [ ] **Step 1: 创建 GET 接口**

```typescript
// src/app/api/leader-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { getLeaderSchedulesByDateRange } from '@/lib/leader-schedules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!authenticateApiRequest(request)) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }

  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');

  if (!start || !end) {
    return apiError(400, 'INVALID_INPUT', 'start and end are required');
  }

  const schedules = getLeaderSchedulesByDateRange(start, end).map(schedule => ({
    id: schedule.id,
    date: schedule.date,
    isManual: Boolean(schedule.is_manual),
    leader: {
      id: schedule.leader.id,
      name: schedule.leader.name,
    },
  }));

  return NextResponse.json(schedules);
}
```

- [ ] **Step 2: 创建 PATCH 接口**

```typescript
// src/app/api/leader-schedules/[date]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, canWriteWithApiToken } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { addApiLog } from '@/lib/logs';
import { getLeaderScheduleByDate, setLeaderSchedule } from '@/lib/leader-schedules';
import { getLeaderById } from '@/lib/leaders';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ date: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = authenticateApiRequest(request);
  if (!auth) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }
  if (!canWriteWithApiToken(auth)) {
    return apiError(403, 'FORBIDDEN', 'Write access requires admin role');
  }

  const body = await request.json().catch(() => null) as { leaderId?: number } | null;
  if (!body?.leaderId) {
    return apiError(400, 'INVALID_INPUT', 'leaderId is required');
  }

  const { date } = await params;
  const leader = getLeaderById(body.leaderId);
  if (!leader) {
    return apiError(404, 'NOT_FOUND', 'Leader not found');
  }

  const previous = getLeaderScheduleByDate(date);
  setLeaderSchedule(date, leader.id, true);
  addApiLog('replace_leader_schedule', `日期: ${date}`, previous?.leader.name ?? '无', leader.name, request, {
    username: `token:${auth.token.name}`,
    role: auth.account.role,
  });

  const updated = getLeaderScheduleByDate(date);
  if (!updated) {
    return apiError(404, 'NOT_FOUND', 'Leader schedule not found');
  }

  return NextResponse.json({
    id: updated.id,
    date: updated.date,
    isManual: Boolean(updated.is_manual),
    leader: {
      id: updated.leader.id,
      name: updated.leader.name,
    },
  });
}
```

- [ ] **Step 3: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 4: 提交**

```bash
git add src/app/api/leader-schedules/
git commit -m "feat(api): 添加值班领导排班 REST API

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: React Query Hooks

**Files:**
- Create: `src/hooks/useLeaderSchedules.ts`

- [ ] **Step 1: 创建 useLeaderSchedules hook**

```typescript
// src/hooks/useLeaderSchedules.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { getLeaderSchedules } from '@/app/actions/leader-schedules';

// 获取值班领导排班数据
export function useLeaderSchedules(month: Date) {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['leaderSchedules', start, end],
    queryFn: () => getLeaderSchedules(start, end),
  });
}

// 失效所有值班领导排班缓存的 hook
export function useInvalidateLeaderSchedules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['leaderSchedules'] });
}
```

- [ ] **Step 2: 导出 hooks**

在 `src/hooks/index.ts` 中添加（保持与现有格式一致）：

```typescript
export {
  useLeaderSchedules,
  useInvalidateLeaderSchedules,
} from './useLeaderSchedules';
```

- [ ] **Step 3: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 4: 提交**

```bash
git add src/hooks/useLeaderSchedules.ts src/hooks/index.ts
git commit -m "feat(hooks): 添加 useLeaderSchedules 和 useInvalidateLeaderSchedules

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: 值班领导管理组件

**Files:**
- Create: `src/components/LeaderManagement.tsx`

- [ ] **Step 1: 创建 LeaderManagement 组件**

参考 `DutyUserManagement.tsx` 的结构，创建简化版的值班领导管理组件：

```typescript
// src/components/LeaderManagement.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createLeader,
  deleteLeaderAction,
  getLeaders,
  reorderLeadersAction,
  toggleLeaderActiveAction,
  getLeaderScheduleCountAction,
} from '@/app/actions/leaders';
import type { Leader } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';

interface LeaderManagementProps {
  canManage: boolean;
}

export function LeaderManagement({ canManage }: LeaderManagementProps) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [formName, setFormName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLeaders = useCallback(async () => {
    const items = await getLeaders();
    setLeaders(items);
  }, []);

  useEffect(() => {
    void loadLeaders();
  }, [loadLeaders]);

  function startEdit(leader: Leader) {
    setEditingId(leader.id);
    setFormName(leader.name);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setFormName('');
    setError(null);
  }

  async function handleSubmit() {
    if (!formName.trim()) {
      setError('请输入领导姓名');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createLeader(formName.trim());

    setLoading(false);

    if (!result.success) {
      setError('保存失败');
      return;
    }

    resetForm();
    await loadLeaders();
  }

  async function handleDelete(leader: Leader) {
    const scheduleCount = await getLeaderScheduleCountAction(leader.id);

    const message = scheduleCount > 0
      ? `确认删除「${leader.name}」吗？该领导有 ${scheduleCount} 条排班记录将被一并删除。`
      : `确认删除「${leader.name}」吗？`;

    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }

    await deleteLeaderAction(leader.id);
    await loadLeaders();
  }

  async function handleToggleActive(leader: Leader) {
    await toggleLeaderActiveAction(leader.id, !leader.is_active);
    await loadLeaders();
  }

  async function handleReorder(newOrder: Leader[]) {
    setLeaders(newOrder);
    await reorderLeadersAction(newOrder.map(l => l.id));
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-lg font-medium mb-3">
            {editingId ? '编辑值班领导' : '添加值班领导'}
          </h3>
          <div className="flex gap-2">
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="输入领导姓名"
              disabled={loading}
            />
            <Button onClick={handleSubmit} disabled={loading}>
              {editingId ? '保存' : '添加'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                取消
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </section>
      ) : null}

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-lg font-medium mb-3">值班领导列表</h3>
        {leaders.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无值班领导</p>
        ) : (
          <div className="space-y-2">
            {leaders.map(leader => (
              <div
                key={leader.id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-background"
              >
                {canManage && (
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                )}
                <span className={`flex-1 ${!leader.is_active ? 'text-muted-foreground line-through' : ''}`}>
                  {leader.name}
                </span>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(leader)}
                      title={leader.is_active ? '禁用' : '启用'}
                    >
                      {leader.is_active ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(leader)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(leader)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/components/LeaderManagement.tsx
git commit -m "feat(components): 添加 LeaderManagement 值班领导管理组件

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: 修改人员管理页面 - 添加 Tab 切换

**Files:**
- Modify: `src/app/dashboard/users/page.tsx`
- Modify: `src/components/DutyUserManagement.tsx`

- [ ] **Step 1: 查看现有 users/page.tsx 结构**

确认 DutyUserManagement 的使用方式

- [ ] **Step 2: 创建包装组件或修改页面**

在 `users/page.tsx` 中添加 Tab 切换逻辑：

```typescript
// 在现有代码基础上添加 Tabs 组件
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DutyUserManagement } from '@/components/DutyUserManagement';
import { LeaderManagement } from '@/components/LeaderManagement';

// 在 JSX 中
<Tabs defaultValue="duty" className="space-y-4">
  <TabsList>
    <TabsTrigger value="duty">值班人员</TabsTrigger>
    <TabsTrigger value="leader">值班领导</TabsTrigger>
  </TabsList>
  <TabsContent value="duty">
    <DutyUserManagement canManage={canManage} />
  </TabsContent>
  <TabsContent value="leader">
    <LeaderManagement canManage={canManage} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 3: 验证编译和运行**

运行: `bun dev`
预期: 页面正常显示 Tab 切换

- [ ] **Step 4: 提交**

```bash
git add src/app/dashboard/users/page.tsx
git commit -m "feat(users): 人员管理页面添加 Tab 切换值班人员/值班领导

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: 设置页面 - 默认值班领导配置

**Files:**
- Create: `src/components/settings/DefaultLeaderSettings.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: 创建 DefaultLeaderSettings 组件**

```typescript
// src/components/settings/DefaultLeaderSettings.tsx
'use client';

import { useEffect, useState } from 'react';
import { getDefaultLeader, setDefaultLeaderAction, getLeadersForSelect } from '@/app/actions/leader-schedules';
import type { Leader } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DefaultLeaderSettingsProps {
  isAdmin: boolean;
}

export function DefaultLeaderSettings({ isAdmin }: DefaultLeaderSettingsProps) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [currentDefaultId, setCurrentDefaultId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const [leadersData, defaultLeader] = await Promise.all([
        getLeadersForSelect(),
        getDefaultLeader(),
      ]);
      setLeaders(leadersData.filter(l => l.is_active));
      setCurrentDefaultId(defaultLeader?.id ?? null);
      setSelectedId(defaultLeader?.id?.toString() ?? '');
    })();
  }, []);

  async function handleSave() {
    setLoading(true);
    const newId = selectedId ? parseInt(selectedId, 10) : null;
    await setDefaultLeaderAction(newId);
    setCurrentDefaultId(newId);
    setLoading(false);
  }

  const hasChanges = selectedId !== (currentDefaultId?.toString() ?? '');

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="选择默认值班领导" />
          </SelectTrigger>
          <SelectContent>
            {leaders.length === 0 ? (
              <SelectItem value="" disabled>请先添加值班领导</SelectItem>
            ) : (
              leaders.map(leader => (
                <SelectItem key={leader.id} value={leader.id.toString()}>
                  {leader.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={loading || !hasChanges}>
          保存
        </Button>
      </div>
      {leaders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          请先在「人员管理 - 值班领导」中添加值班领导
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 修改设置页面**

在 `settings/page.tsx` 中添加默认值班领导配置区块：

```typescript
import { DefaultLeaderSettings } from '@/components/settings/DefaultLeaderSettings';

// 在 admin 区块中添加
{isAdmin ? (
  <section className="rounded-2xl border bg-card p-4 sm:p-6">
    <div className="mb-4">
      <h2 className="text-xl font-semibold">默认值班领导</h2>
      <p className="text-sm text-muted-foreground">设置自动排班时使用的默认值班领导。</p>
    </div>
    <DefaultLeaderSettings isAdmin={isAdmin} />
  </section>
) : null}
```

- [ ] **Step 3: 验证编译和运行**

运行: `bun dev`
预期: 设置页面显示默认值班领导配置

- [ ] **Step 4: 提交**

```bash
git add src/components/settings/DefaultLeaderSettings.tsx src/app/dashboard/settings/page.tsx
git commit -m "feat(settings): 添加默认值班领导配置

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: 月历视图 - 视图模式切换

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: 添加视图模式状态**

在 CalendarView 组件中添加：

```typescript
type ViewMode = 'duty' | 'leader' | 'all';

// 在组件内部
const [viewMode, setViewMode] = useState<ViewMode>('duty');
```

- [ ] **Step 2: 添加视图切换按钮组**

在工具栏中添加切换按钮：

```tsx
<div className="flex items-center gap-1 border rounded-lg p-1">
  <Button
    variant={viewMode === 'duty' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('duty')}
  >
    值班员
  </Button>
  <Button
    variant={viewMode === 'leader' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('leader')}
  >
    领导
  </Button>
  <Button
    variant={viewMode === 'all' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('all')}
  >
    全部
  </Button>
</div>
```

- [ ] **Step 3: 加载值班领导数据**

```typescript
// 导入 hook
import { useLeaderSchedules, useInvalidateLeaderSchedules } from '@/hooks/useLeaderSchedules';

// 在组件内部
const { data: leaderSchedules = [], isLoading: isLoadingLeaderSchedules } = useLeaderSchedules(currentMonth);
const invalidateLeaderSchedules = useInvalidateLeaderSchedules();
```

- [ ] **Step 4: 传递数据给 MonthCalendar**

修改 MonthCalendar props，添加 viewMode 和 leaderSchedules

- [ ] **Step 5: 验证编译**

运行: `bun run build`
预期: 编译成功

- [ ] **Step 6: 提交**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat(calendar): 添加三种视图模式切换（值班员/领导/全部）

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 15: 月历视图 - CalendarCell 支持双行显示

**Files:**
- Modify: `src/components/CalendarCell.tsx`

- [ ] **Step 1: 扩展 CalendarCell Props**

```typescript
interface CalendarCellProps {
  // ... 现有 props
  viewMode?: 'duty' | 'leader' | 'all';
  leaderSchedule?: LeaderScheduleWithLeader;
}
```

- [ ] **Step 2: 修改渲染逻辑**

根据 viewMode 显示不同内容：

- `duty`: 现有逻辑
- `leader`: 显示值班领导（复用现有样式）
- `all`: 显示值班员 + 下方小字号值班领导

```tsx
// 在 'all' 模式下
{viewMode === 'all' && (
  <>
    {/* 值班员 - 现有显示 */}
    {/* 值班领导 - 下方小字号 */}
    {leaderSchedule && (
      <div className="text-[10px] text-muted-foreground mt-1 truncate">
        {leaderSchedule.leader.name}
      </div>
    )}
  </>
)}
```

- [ ] **Step 3: 验证编译和运行**

运行: `bun dev`
预期: 月历视图正常显示三种模式

- [ ] **Step 4: 提交**

```bash
git add src/components/CalendarCell.tsx
git commit -m "feat(calendar): CalendarCell 支持三种视图模式和双行显示

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 16: 集成测试和最终提交

**Files:**
- Multiple

- [ ] **Step 1: 运行完整构建**

运行: `bun run build`
预期: 构建成功，无错误

- [ ] **Step 2: 手动测试核心功能**

1. 访问人员管理页面，切换到「值班领导」Tab
2. 添加值班领导
3. 访问设置页面，设置默认值班领导
4. 访问月历视图，切换三种视图模式
5. 执行自动排班，验证值班领导是否同步生成

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat: 完成值班领导功能

- 新增 leaders 和 leader_schedules 数据表
- 添加值班领导管理（增删改、排序、启用/禁用）
- 支持三种月历视图模式（值班员/领导/全部）
- 自动排班时同步生成值班领导
- 提供值班领导和值班领导排班 REST API
- 设置页面支持默认值班领导配置

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务依赖关系

```
Task 1 (数据库迁移)
  ↓
Task 2 (类型定义)
  ↓
Task 3, 4 (后端 CRUD)
  ↓
Task 5, 6 (Server Actions)
  ↓
Task 7 (自动排班逻辑)
  ↓
Task 8, 9 (REST API) ─┐
Task 10 (Hooks)      ─┼─→ Task 14, 15 (月历视图)
Task 11, 12, 13 (UI) ─┘
```

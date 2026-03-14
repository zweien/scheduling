# 值班排班系统实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小团队构建一个值班排班系统，支持自动排班、手动调整、统计和日志功能。

**Architecture:** Next.js 15 App Router + Server Actions 处理数据操作，better-sqlite3 作为本地数据库，shadcn/ui 构建界面。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, SQLite (better-sqlite3), @dnd-kit/core, date-fns, iron-session

---

## Chunk 1: 项目初始化

### Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `.gitignore`

- [ ] **Step 1: 创建 Next.js 项目**

```bash
cd /home/z/scheduling && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

Expected: 项目创建成功

- [ ] **Step 2: 安装依赖**

```bash
npm install better-sqlite3 @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns iron-session
npm install -D @types/better-sqlite3
```

Expected: 依赖安装成功

- [ ] **Step 3: 安装 shadcn/ui**

```bash
npx shadcn@latest init -d
```

Expected: shadcn 初始化成功

- [ ] **Step 4: 安装 shadcn 组件**

```bash
npx shadcn@latest add button card dialog input label select toast -y
```

Expected: 组件安装成功

- [ ] **Step 5: 创建数据目录**

```bash
mkdir -p data
```

Expected: data 目录创建成功

- [ ] **Step 6: 提交基础结构**

```bash
git add . && git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Chunk 2: 数据库层

### Task 2: 类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/types/index.ts

export interface User {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Schedule {
  id: number;
  date: string;
  user_id: number;
  is_manual: boolean;
  created_at: string;
}

export interface ScheduleWithUser extends Schedule {
  user: User;
}

export interface Log {
  id: number;
  action: string;
  target: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Config {
  key: string;
  value: string;
}

export type Action =
  | 'login'
  | 'logout'
  | 'add_user'
  | 'delete_user'
  | 'reorder_users'
  | 'generate_schedule'
  | 'replace_schedule'
  | 'swap_schedule'
  | 'set_password';
```

- [ ] **Step 2: 提交类型定义**

```bash
git add src/types/index.ts && git commit -m "feat: add type definitions"
```

### Task 3: 数据库初始化

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: 创建数据库模块**

```typescript
// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'scheduling.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('journal_mode = WAL');

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    is_manual INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// 初始化默认密码
const defaultPassword = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;
if (!defaultPassword) {
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('password', '123456');
}

export default db;
```

- [ ] **Step 2: 提交数据库模块**

```bash
git add src/lib/db.ts && git commit -m "feat: add database initialization"
```

### Task 4: 数据库操作函数

**Files:**
- Create: `src/lib/users.ts`
- Create: `src/lib/schedules.ts`
- Create: `src/lib/logs.ts`

- [ ] **Step 1: 创建用户操作模块**

```typescript
// src/lib/users.ts
import db from './db';
import type { User } from '@/types';

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY sort_order').all() as User[];
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(name: string): User {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM users').get() as { max: number | null };
  const sortOrder = (maxOrder?.max ?? 0) + 1;
  const result = db.prepare('INSERT INTO users (name, sort_order) VALUES (?, ?)').run(name, sortOrder);
  return getUserById(result.lastInsertRowid as number)!;
}

export function deleteUser(id: number): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function reorderUsers(userIds: number[]): void {
  const update = db.prepare('UPDATE users SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    userIds.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  transaction();
}
```

- [ ] **Step 2: 创建排班操作模块**

```typescript
// src/lib/schedules.ts
import db from './db';
import type { Schedule, ScheduleWithUser } from '@/types';
import { getUserById } from './users';

export function getScheduleByDate(date: string): ScheduleWithUser | undefined {
  const schedule = db.prepare('SELECT * FROM schedules WHERE date = ?').get(date) as Schedule | undefined;
  if (!schedule) return undefined;
  const user = getUserById(schedule.user_id);
  if (!user) return undefined;
  return { ...schedule, user };
}

export function getSchedulesByDateRange(startDate: string, endDate: string): ScheduleWithUser[] {
  const schedules = db.prepare(
    'SELECT * FROM schedules WHERE date >= ? AND date <= ? ORDER BY date'
  ).all(startDate, endDate) as Schedule[];
  return schedules.map(s => ({
    ...s,
    user: getUserById(s.user_id)!
  })).filter(s => s.user);
}

export function setSchedule(date: string, userId: number, isManual: boolean = false): void {
  db.prepare(`
    INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET user_id = ?, is_manual = ?
  `).run(date, userId, isManual ? 1 : 0, userId, isManual ? 1 : 0);
}

export function deleteSchedule(date: string): void {
  db.prepare('DELETE FROM schedules WHERE date = ?').run(date);
}

export function getScheduleStats(startDate?: string, endDate?: string): { userId: number; count: number }[] {
  let query = `
    SELECT user_id, COUNT(*) as count
    FROM schedules
  `;
  const params: string[] = [];

  if (startDate && endDate) {
    query += ' WHERE date >= ? AND date <= ?';
    params.push(startDate, endDate);
  }

  query += ' GROUP BY user_id ORDER BY count DESC';

  return db.prepare(query).all(...params) as { userId: number; count: number }[];
}
```

- [ ] **Step 3: 创建日志操作模块**

```typescript
// src/lib/logs.ts
import db from './db';
import type { Log, Action } from '@/types';

export function addLog(action: Action, target: string, oldValue?: string, newValue?: string): void {
  db.prepare('INSERT INTO logs (action, target, old_value, new_value) VALUES (?, ?, ?, ?)').run(
    action,
    target,
    oldValue ?? null,
    newValue ?? null
  );
}

export function getLogs(limit: number = 100): Log[] {
  return db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit) as Log[];
}
```

- [ ] **Step 4: 提交数据库操作模块**

```bash
git add src/lib/users.ts src/lib/schedules.ts src/lib/logs.ts && git commit -m "feat: add database operation modules"
```

---

## Chunk 3: 认证系统

### Task 5: Session 配置

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/lib/auth.ts`

- [ ] **Step 1: 创建 Session 配置**

```typescript
// src/lib/session.ts
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionData {
  isLoggedIn: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'scheduling_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
```

- [ ] **Step 2: 创建认证函数**

```typescript
// src/lib/auth.ts
import db from './db';
import { getSession } from './session';
import { addLog } from './logs';

export async function checkAuth(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  const config = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;

  if (!config || config.value !== password) {
    return { success: false, error: '密码错误' };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  addLog('login', '系统', undefined, '用户登录');

  return { success: true };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  addLog('logout', '系统', undefined, '用户退出');
  session.destroy();
}

export async function updatePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const config = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;

  if (!config || config.value !== oldPassword) {
    return { success: false, error: '原密码错误' };
  }

  db.prepare('UPDATE config SET value = ? WHERE key = ?').run(newPassword, 'password');
  addLog('set_password', '系统', '******', '******');

  return { success: true };
}
```

- [ ] **Step 3: 提交认证模块**

```bash
git add src/lib/session.ts src/lib/auth.ts && git commit -m "feat: add authentication system"
```

### Task 6: Server Actions - 认证

**Files:**
- Create: `src/app/actions/auth.ts`

- [ ] **Step 1: 创建认证 Actions**

```typescript
// src/app/actions/auth.ts
'use server';

import { login as doLogin, logout as doLogout } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const password = formData.get('password') as string;
  const result = await doLogin(password);

  if (!result.success) {
    return { error: result.error };
  }

  redirect('/dashboard');
}

export async function logout() {
  await doLogout();
  redirect('/');
}
```

- [ ] **Step 2: 提交认证 Actions**

```bash
git add src/app/actions/auth.ts && git commit -m "feat: add auth server actions"
```

### Task 7: 登录页面

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/LoginForm.tsx`

- [ ] **Step 1: 创建登录表单组件**

```typescript
// src/components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>值班排班系统</CardTitle>
          <CardDescription>请输入密码登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="请输入密码"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 更新首页**

```typescript
// src/app/page.tsx
import { checkAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';

export default async function Home() {
  const isLoggedIn = await checkAuth();
  if (isLoggedIn) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
```

- [ ] **Step 3: 提交登录页面**

```bash
git add src/app/page.tsx src/components/LoginForm.tsx && git commit -m "feat: add login page"
```

---

## Chunk 4: Dashboard 布局

### Task 8: Dashboard 页面结构

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/components/Header.tsx`
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: 创建 Header 组件**

```typescript
// src/components/Header.tsx
'use client';

import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';

type ViewMode = 'calendar' | 'list';

interface HeaderProps {
  onToggleSidebar: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShowStats: () => void;
  onShowLogs: () => void;
}

export function Header({ onToggleSidebar, viewMode, onViewModeChange, onShowStats, onShowLogs }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden">
          ☰
        </Button>
        <h1 className="text-lg font-semibold">值班排班系统</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex border rounded overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none"
          >
            月历
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-none"
          >
            列表
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={onShowStats}>统计</Button>
        <Button variant="outline" size="sm" onClick={onShowLogs}>日志</Button>

        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">退出</Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 创建 Sidebar 组件骨架**

```typescript
// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SidebarProps {
  isOpen: boolean;
  onScheduleGenerated: () => void;
}

export function Sidebar({ isOpen, onScheduleGenerated }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r bg-white p-4 space-y-4 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人员管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-gray-500">加载中...</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成排班</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-gray-500">加载中...</div>
        </CardContent>
      </Card>
    </aside>
  );
}
```

- [ ] **Step 3: 创建 Dashboard 布局**

```typescript
// src/app/dashboard/layout.tsx
import { checkAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) {
    redirect('/');
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: 创建 Dashboard 页面**

```typescript
// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        viewMode="calendar"
        onViewModeChange={() => {}}
        onShowStats={() => {}}
        onShowLogs={() => {}}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onScheduleGenerated={() => {}} />
        <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          <div className="text-center text-gray-500 py-20">选择日期范围生成排班</div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 提交 Dashboard 结构**

```bash
git add src/app/dashboard/ src/components/Header.tsx src/components/Sidebar.tsx && git commit -m "feat: add dashboard layout structure"
```

---

## Chunk 5: 人员管理

### Task 9: Server Actions - 人员管理

**Files:**
- Create: `src/app/actions/users.ts`

- [ ] **Step 1: 创建人员管理 Actions**

```typescript
// src/app/actions/users.ts
'use server';

import { getAllUsers, createUser, deleteUser, reorderUsers } from '@/lib/users';
import { addLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function getUsers() {
  return getAllUsers();
}

export async function addUser(name: string) {
  const user = createUser(name);
  addLog('add_user', `人员: ${name}`);
  revalidatePath('/dashboard');
  return user;
}

export async function removeUser(id: number, name: string) {
  deleteUser(id);
  addLog('delete_user', `人员: ${name}`);
  revalidatePath('/dashboard');
}

export async function updateUserOrder(userIds: number[]) {
  reorderUsers(userIds);
  addLog('reorder_users', '人员排序');
  revalidatePath('/dashboard');
}
```

- [ ] **Step 2: 提交人员管理 Actions**

```bash
git add src/app/actions/users.ts && git commit -m "feat: add user management server actions"
```

### Task 10: 人员列表组件

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Create: `src/components/UserList.tsx`

- [ ] **Step 1: 创建 UserList 组件**

```typescript
// src/components/UserList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUsers, addUser, removeUser, updateUserOrder } from '@/app/actions/users';
import type { User } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ user, onDelete }: { user: User; onDelete: (id: number, name: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-move hover:bg-gray-100">
      <span className="text-sm">{user.name}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(user.id, user.name)} className="h-6 w-6 p-0 text-red-500">
        ×
      </Button>
    </div>
  );
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleAdd() {
    if (!newName.trim()) return;
    const user = await addUser(newName.trim());
    setUsers([...users, user]);
    setNewName('');
  }

  async function handleDelete(id: number, name: string) {
    await removeUser(id, name);
    setUsers(users.filter(u => u.id !== id));
  }

  async function handleDragEnd(event: { active: any; over: any }) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = users.findIndex(u => u.id === active.id);
      const newIndex = users.findIndex(u => u.id === over.id);
      const newUsers = arrayMove(users, oldIndex, newIndex);
      setUsers(newUsers);
      await updateUserOrder(newUsers.map(u => u.id));
    }
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={users.map(u => u.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {users.map(user => (
              <SortableItem key={user.id} user={user} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input
          placeholder="添加人员"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="h-8"
        />
        <Button size="sm" onClick={handleAdd} className="h-8">添加</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 Sidebar 集成 UserList**

```typescript
// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserList } from '@/components/UserList';
import { ScheduleGenerator } from '@/components/ScheduleGenerator';

interface SidebarProps {
  isOpen: boolean;
  onScheduleGenerated: () => void;
}

export function Sidebar({ isOpen, onScheduleGenerated }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r bg-white p-4 space-y-4 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人员管理</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成排班</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleGenerator onGenerated={onScheduleGenerated} />
        </CardContent>
      </Card>
    </aside>
  );
}
```

- [ ] **Step 3: 提交人员列表组件**

```bash
git add src/components/UserList.tsx src/components/Sidebar.tsx && git commit -m "feat: add user list with drag-and-drop sorting"
```

---

## Chunk 6: 排班生成

### Task 11: 排班逻辑

**Files:**
- Create: `src/lib/schedule.ts`

- [ ] **Step 1: 创建排班生成逻辑**

```typescript
// src/lib/schedule.ts
import { getAllUsers } from './users';
import { setSchedule, getSchedulesByDateRange } from './schedules';
import { addLog } from './logs';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export function generateSchedule(startDate: string, endDate: string) {
  const users = getAllUsers();
  if (users.length === 0) {
    throw new Error('请先添加值班人员');
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = eachDayOfInterval({ start, end });

  // 获取已有手动调整的日期
  const existingSchedules = getSchedulesByDateRange(startDate, endDate);
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

  addLog('generate_schedule', `日期: ${startDate} ~ ${endDate}`, undefined, assigned.join(', '));
}
```

- [ ] **Step 2: 提交排班逻辑**

```bash
git add src/lib/schedule.ts && git commit -m "feat: add schedule generation logic"
```

### Task 12: Server Actions - 排班

**Files:**
- Create: `src/app/actions/schedule.ts`

- [ ] **Step 1: 创建排班 Actions**

```typescript
// src/app/actions/schedule.ts
'use server';

import { generateSchedule as doGenerateSchedule } from '@/lib/schedule';
import { getSchedulesByDateRange, setSchedule, getScheduleStats } from '@/lib/schedules';
import { getUserById } from '@/lib/users';
import { addLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';

export async function generateScheduleAction(startDate: string, endDate: string) {
  try {
    doGenerateSchedule(startDate, endDate);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getSchedules(startDate: string, endDate: string) {
  return getSchedulesByDateRange(startDate, endDate);
}

export async function replaceSchedule(date: string, newUserId: number) {
  const oldSchedules = getSchedulesByDateRange(date, date);
  const oldSchedule = oldSchedules[0];
  const oldUser = oldSchedule ? getUserById(oldSchedule.user_id) : null;
  const newUser = getUserById(newUserId);

  setSchedule(date, newUserId, true);

  addLog(
    'replace_schedule',
    `日期: ${date}`,
    oldUser?.name ?? '无',
    newUser?.name ?? '无'
  );

  revalidatePath('/dashboard');
}

export async function swapSchedules(date1: string, date2: string) {
  const schedules = getSchedulesByDateRange(date1 > date2 ? date2 : date1, date1 > date2 ? date1 : date2);
  const s1 = schedules.find(s => s.date === date1);
  const s2 = schedules.find(s => s.date === date2);

  if (!s1 || !s2) {
    return { success: false, error: '找不到排班记录' };
  }

  setSchedule(date1, s2.user_id, true);
  setSchedule(date2, s1.user_id, true);

  addLog(
    'swap_schedule',
    `交换: ${date1} <-> ${date2}`,
    `${s1.user.name} <-> ${s2.user.name}`,
    `${s2.user.name} <-> ${s1.user.name}`
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getStats(startDate?: string, endDate?: string) {
  const stats = getScheduleStats(startDate, endDate);
  return stats.map(s => ({
    userId: s.userId,
    userName: getUserById(s.userId)?.name ?? '未知',
    count: s.count,
  }));
}
```

- [ ] **Step 2: 提交排班 Actions**

```bash
git add src/app/actions/schedule.ts && git commit -m "feat: add schedule server actions"
```

### Task 13: 排班生成器组件

**Files:**
- Create: `src/components/ScheduleGenerator.tsx`

- [ ] **Step 1: 创建排班生成器组件**

```typescript
// src/components/ScheduleGenerator.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateScheduleAction } from '@/app/actions/schedule';

interface ScheduleGeneratorProps {
  onGenerated: () => void;
}

export function ScheduleGenerator({ onGenerated }: ScheduleGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!startDate || !endDate) {
      setError('请选择日期范围');
      return;
    }

    if (startDate > endDate) {
      setError('开始日期不能晚于结束日期');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await generateScheduleAction(startDate, endDate);

    if (result.success) {
      onGenerated();
    } else {
      setError(result.error ?? '生成失败');
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="space-y-1">
        <Label htmlFor="startDate" className="text-xs">开始日期</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="h-8"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="endDate" className="text-xs">结束日期</Label>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="h-8"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading} className="w-full h-8">
        {loading ? '生成中...' : '生成排班'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 提交排班生成器组件**

```bash
git add src/components/ScheduleGenerator.tsx && git commit -m "feat: add schedule generator component"
```

---

## Chunk 7: 日历视图

### Task 14: 日历视图组件

**Files:**
- Create: `src/components/CalendarView.tsx`
- Create: `src/components/CalendarCell.tsx`

- [ ] **Step 1: 创建日历单元格组件**

```typescript
// src/components/CalendarCell.tsx
'use client';

import type { ScheduleWithUser } from '@/types';

interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  isToday: boolean;
  onClick: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

export function CalendarCell({ date, schedule, isToday, onClick, onDragStart, onDragOver, onDrop }: CalendarCellProps) {
  const day = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      onClick={onClick}
      draggable={!!schedule}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        min-h-[80px] p-2 border rounded cursor-pointer transition-colors
        ${isToday ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-200'}
        ${isWeekend ? 'bg-gray-50' : 'bg-white'}
        ${schedule ? 'hover:border-blue-300' : ''}
        ${schedule?.is_manual ? 'bg-amber-50' : ''}
      `}
    >
      <div className={`text-sm font-medium ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
        {day}
      </div>
      {schedule && (
        <div className="mt-1 text-xs text-blue-600 font-medium truncate">
          {schedule.user.name}
          {schedule.is_manual && <span className="ml-1 text-amber-500">*</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建日历视图组件**

```typescript
// src/components/CalendarView.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarCell } from './CalendarCell';
import { UserSelectDialog } from './UserSelectDialog';
import { getSchedules, replaceSchedule, swapSchedules } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { Button } from '@/components/ui/button';

interface CalendarViewProps {
  refreshKey: number;
}

export function CalendarView({ refreshKey }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);

  const today = new Date();

  const loadData = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const [scheduleData, userData] = await Promise.all([
      getSchedules(start, end),
      getUsers(),
    ]);
    setSchedules(scheduleData);
    setUsers(userData);
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleCellClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const handleReplace = async (userId: number) => {
    if (!selectedDate) return;
    await replaceSchedule(selectedDate, userId);
    setDialogOpen(false);
    loadData();
  };

  const handleDragStart = (date: string) => {
    setDragDate(date);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetDate: string) => {
    if (!dragDate || dragDate === targetDate) return;
    await swapSchedules(dragDate, targetDate);
    setDragDate(null);
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            上月
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(today)}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            下月
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const schedule = schedules.find(s => s.date === dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          if (!isCurrentMonth) {
            return (
              <div key={dateStr} className="min-h-[80px] p-2 border rounded border-gray-100 bg-gray-50 opacity-50">
                <div className="text-sm text-gray-300">{format(day, 'd')}</div>
              </div>
            );
          }

          return (
            <CalendarCell
              key={dateStr}
              date={day}
              schedule={schedule}
              isToday={isSameDay(day, today)}
              onClick={() => handleCellClick(day)}
              onDragStart={() => handleDragStart(dateStr)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(dateStr)}
            />
          );
        })}
      </div>

      <UserSelectDialog
        open={dialogOpen}
        users={users}
        onSelect={handleReplace}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 3: 创建人员选择对话框**

```typescript
// src/components/UserSelectDialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface UserSelectDialogProps {
  open: boolean;
  users: User[];
  onSelect: (userId: number) => void;
  onClose: () => void;
}

export function UserSelectDialog({ open, users, onSelect, onClose }: UserSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>选择值班人员</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
          {users.map(user => (
            <Button
              key={user.id}
              variant="outline"
              onClick={() => onSelect(user.id)}
              className="justify-start"
            >
              {user.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 提交日历视图组件**

```bash
git add src/components/CalendarView.tsx src/components/CalendarCell.tsx src/components/UserSelectDialog.tsx && git commit -m "feat: add calendar view with drag-and-drop swap"
```

---

## Chunk 8: 列表视图与视图切换

### Task 15: 列表视图组件

**Files:**
- Create: `src/components/ListView.tsx`

- [ ] **Step 1: 创建列表视图组件**

```typescript
// src/components/ListView.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getSchedules, replaceSchedule } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { UserSelectDialog } from './UserSelectDialog';
import { Card } from '@/components/ui/card';

interface ListViewProps {
  refreshKey: number;
}

export function ListView({ refreshKey }: ListViewProps) {
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    const today = new Date();
    const start = format(today, 'yyyy-MM-01');
    const end = format(today, 'yyyy-MM-dd');
    const [scheduleData, userData] = await Promise.all([
      getSchedules(start, end),
      getUsers(),
    ]);
    setSchedules(scheduleData);
    setUsers(userData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleRowClick = (date: string) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleReplace = async (userId: number) => {
    if (!selectedDate) return;
    await replaceSchedule(selectedDate, userId);
    setDialogOpen(false);
    loadData();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">值班列表</h2>

      {schedules.length === 0 ? (
        <div className="text-center text-gray-500 py-10">暂无排班数据</div>
      ) : (
        <Card className="divide-y">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              onClick={() => handleRowClick(schedule.date)}
              className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
            >
              <div>
                <div className="font-medium">
                  {format(parseISO(schedule.date), 'M月d日 EEEE', { locale: zhCN })}
                </div>
                <div className="text-sm text-gray-500">
                  {schedule.is_manual && <span className="text-amber-500 mr-1">* 手动调整</span>}
                </div>
              </div>
              <div className="text-blue-600 font-medium">{schedule.user.name}</div>
            </div>
          ))}
        </Card>
      )}

      <UserSelectDialog
        open={dialogOpen}
        users={users}
        onSelect={handleReplace}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: 提交列表视图组件**

```bash
git add src/components/ListView.tsx && git commit -m "feat: add list view component"
```

### Task 16: Dashboard 集成

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: 更新 Dashboard 页面集成所有组件**

```typescript
// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';
import { StatisticsDialog } from '@/components/StatisticsDialog';
import { LogDialog } from '@/components/LogDialog';

type ViewMode = 'calendar' | 'list';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const handleScheduleGenerated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onShowStats={() => setStatsOpen(true)}
        onShowLogs={() => setLogsOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onScheduleGenerated={handleScheduleGenerated} />
        <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          {viewMode === 'calendar' ? (
            <CalendarView refreshKey={refreshKey} />
          ) : (
            <ListView refreshKey={refreshKey} />
          )}
        </main>
      </div>

      <StatisticsDialog open={statsOpen} onClose={() => setStatsOpen(false)} />
      <LogDialog open={logsOpen} onClose={() => setLogsOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: 提交视图切换集成**

```bash
git add src/app/dashboard/page.tsx && git commit -m "feat: integrate all components in dashboard"
```

---

## Chunk 9: 统计功能

### Task 17: 统计对话框组件

**Files:**
- Create: `src/components/StatisticsDialog.tsx`

- [ ] **Step 1: 创建统计对话框组件**

```typescript
// src/components/StatisticsDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStats } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import type { User } from '@/types';

interface StatisticsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface StatItem {
  userId: number;
  userName: string;
  count: number;
}

export function StatisticsDialog({ open, onClose }: StatisticsDialogProps) {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (open) {
      Promise.all([getStats(), getUsers()]).then(([statsData, usersData]) => {
        setStats(statsData);
        setUsers(usersData);
      });
    }
  }, [open]);

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  // 找出最多和最少值班的人
  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const mostDuty = sortedStats[0];
  const leastDuty = sortedStats[sortedStats.length - 1];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>值班统计</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-sm text-gray-500">总值班次数</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{users.length}</div>
              <div className="text-sm text-gray-500">值班人数</div>
            </div>
          </div>

          {stats.length > 0 && (
            <>
              <div className="text-sm font-medium text-gray-700">人员对比</div>
              <div className="space-y-2">
                {stats.map(stat => (
                  <div key={stat.userId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{stat.userName}</span>
                      <span className="font-medium">{stat.count} 次</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(stat.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {mostDuty && leastDuty && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-amber-50 p-2 rounded">
                    <span className="text-amber-600">最多：</span>
                    <span className="font-medium">{mostDuty.userName} ({mostDuty.count}次)</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500">最少：</span>
                    <span className="font-medium">{leastDuty.userName} ({leastDuty.count}次)</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 提交统计对话框组件**

```bash
git add src/components/StatisticsDialog.tsx && git commit -m "feat: add statistics dialog"
```

---

## Chunk 10: 日志功能

### Task 18: 日志 Server Actions

**Files:**
- Create: `src/app/actions/logs.ts`

- [ ] **Step 1: 创建日志 Actions**

```typescript
// src/app/actions/logs.ts
'use server';

import { getLogs } from '@/lib/logs';

export async function getLogList(limit: number = 100) {
  return getLogs(limit);
}
```

- [ ] **Step 2: 提交日志 Actions**

```bash
git add src/app/actions/logs.ts && git commit -m "feat: add logs server actions"
```

### Task 19: 日志对话框组件

**Files:**
- Create: `src/components/LogDialog.tsx`

- [ ] **Step 1: 创建日志对话框组件**

```typescript
// src/components/LogDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLogList } from '@/app/actions/logs';
import type { Log } from '@/types';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface LogDialogProps {
  open: boolean;
  onClose: () => void;
}

const actionLabels: Record<string, string> = {
  login: '登录',
  logout: '退出',
  add_user: '添加人员',
  delete_user: '删除人员',
  reorder_users: '调整排序',
  generate_schedule: '生成排班',
  replace_schedule: '替换值班',
  swap_schedule: '交换值班',
  set_password: '修改密码',
};

export function LogDialog({ open, onClose }: LogDialogProps) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (open) {
      getLogList().then(setLogs);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>操作日志</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-10">暂无日志记录</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="border rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-blue-600">
                      {actionLabels[log.action] || log.action}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {format(parseISO(log.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                    </div>
                  </div>
                  <div className="mt-1 text-gray-600">{log.target}</div>
                  {log.old_value && log.new_value && (
                    <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                      <div><span className="text-red-500">旧值：</span>{log.old_value}</div>
                      <div><span className="text-green-500">新值：</span>{log.new_value}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 提交日志对话框组件**

```bash
git add src/components/LogDialog.tsx && git commit -m "feat: add log dialog component"
```

---

## Chunk 11: 最终完善

### Task 20: 添加 Toast 提示

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 确保 sonner 组件已添加**

```bash
npx shadcn@latest add sonner -y
```

- [ ] **Step 2: 更新 layout.tsx 添加 Toaster**

在 layout.tsx 中添加 Toaster 组件

- [ ] **Step 3: 提交 Toast 配置**

```bash
git add . && git commit -m "feat: add toast notifications"
```

### Task 21: 最终验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 手动测试所有功能**

1. 访问 http://localhost:3000
2. 使用默认密码 `123456` 登录
3. 添加几个人员
4. 拖拽调整人员顺序
5. 选择日期范围生成排班
6. 点击日期替换值班人员
7. 拖拽日期交换值班
8. 查看统计功能
9. 查看日志功能
10. 切换月历/列表视图
11. 退出登录

- [ ] **Step 3: 最终提交**

```bash
git add . && git commit -m "chore: final verification complete"
```

---

## 完成清单

- [ ] 项目初始化完成
- [ ] 数据库层完成
- [ ] 认证系统完成
- [ ] 人员管理完成
- [ ] 排班生成完成
- [ ] 手动调整完成
- [ ] 日历视图完成
- [ ] 列表视图完成
- [ ] 统计功能完成
- [ ] 日志功能完成
- [ ] 手动测试通过

# 全面性能优化设计

> **版本**: v1.7.0
> **日期**: 2026-03-21
> **范围**: 数据层缓存 + 组件优化 + RSC 重构

## 问题诊断

### 当前性能问题

| 问题 | 位置 | 影响 | 严重程度 |
|------|------|------|----------|
| 数据获取无缓存 | `CalendarView.tsx` | 每次操作后 `loadData()` 全量刷新 | 🔴 高 |
| 组件过于庞大 | `CalendarView.tsx` (820行) | 25 hooks, 18 useState，难以优化 | 🔴 高 |
| 缺少 memoization | 全局 (仅9处) | 列表项不必要重渲染 | 🟡 中 |
| 全部客户端组件 | 28 个 `'use client'` | Bundle 体积大，首屏慢 | 🟡 中 |
| 重复代码 | 多个 Dialog 组件 | 维护成本高 | 🟢 低 |

### 当前优点（保留）

- ✅ 骨架屏加载状态已实现
- ✅ 36 处 `revalidatePath` 有缓存意识
- ✅ 使用 `queueMicrotask` 优化渲染
- ✅ `useCallback` 用于关键回调

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Server Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ RSC Pages   │  │Server Actions│  │ unstable_cache()    │  │
│  │ (静态UI)    │  │ (mutations)  │  │ (服务端缓存)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (新增)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ TanStack Query (React Query)                            ││
│  │ - useSchedules()   - useUsers()   - useConfigOptions()  ││
│  │ - 乐观更新    - 后台刷新    - 请求去重   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Component Layer                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ CalendarView (重构后)                                  │ │
│  │ - useCalendarData() hook    - useCalendarDrag() hook   │ │
│  │ - useCalendarSelection()    - React.memo 子组件        │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Server-only  │  │ Client-only  │  │ Hybrid           │  │
│  │ (Header等)   │  │ (Dialogs)    │  │ (Calendar)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 详细设计

### 1. 数据层优化 - TanStack Query

#### 1.1 安装依赖

```bash
npm install @tanstack/react-query
```

#### 1.2 Query Provider 设置

```typescript
// src/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1分钟内不重新获取
            gcTime: 5 * 60 * 1000, // 缓存保留5分钟
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 1.3 自定义 Hooks

```typescript
// src/hooks/useSchedules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import type { ScheduleWithUser } from '@/types';

// 获取排班数据
export function useSchedules(month: Date) {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['schedules', start, end],
    queryFn: () => getSchedules(start, end),
  });
}

// 获取可分配用户
export function useAssignableUsers() {
  return useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: getAssignableUsers,
    staleTime: 5 * 60 * 1000, // 用户列表变化少，缓存更久
  });
}

// 替换排班（乐观更新）
export function useReplaceSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, userId }: { date: string; userId: number }) =>
      replaceSchedule(date, userId),
    onMutate: async ({ date, userId }) => {
      // 取消进行中的查询，防止覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: ['schedules'] });

      // 保存旧数据用于回滚
      const previousSchedules = queryClient.getQueryData(['schedules']);

      // 乐观更新
      queryClient.setQueryData(['schedules'], (old: ScheduleWithUser[] = []) =>
        old.map(s => (s.date === date ? { ...s, user_id: userId, is_manual: true } : s))
      );

      return { previousSchedules };
    },
    onError: (err, variables, context) => {
      // 回滚
      if (context?.previousSchedules) {
        queryClient.setQueryData(['schedules'], context.previousSchedules);
      }
    },
    onSettled: () => {
      // 后台刷新确保数据一致性
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
```

#### 1.4 数据层收益

- **请求去重**: 多个组件请求相同数据只发一次
- **乐观更新**: 操作立即反馈，失败时回滚
- **智能缓存**: 1分钟内不重新获取，减少 80%+ 请求
- **后台刷新**: 操作后静默刷新，不影响交互

### 2. 组件层优化

#### 2.1 CalendarView 拆分策略

将 820 行的 CalendarView 拆分为：

```
src/components/calendar/
├── CalendarView.tsx          # 主容器 (~150行)
├── MonthCalendar.tsx         # 月历组件 (~100行)
├── CalendarCell.tsx          # 单元格 (已有，memo化)
├── CalendarHeader.tsx        # 顶部控制栏 (~80行)
├── CalendarLoading.tsx       # 加载骨架屏 (~50行)
├── hooks/
│   ├── useCalendarData.ts    # 数据获取逻辑
│   ├── useCalendarDrag.ts    # 拖拽逻辑
│   ├── useCalendarSelection.ts # 选择逻辑
│   └── useCalendarDisplay.ts  # 显示模式逻辑
└── context/
    └── CalendarContext.tsx    # 共享状态
```

#### 2.2 Context 设计

```typescript
// src/components/calendar/context/CalendarContext.tsx
import { createContext, useContext, useMemo, useCallback } from 'react';

type CalendarContextValue = {
  // 状态
  currentMonth: Date;
  displayMode: 'avatar' | 'name';
  selectedDates: Set<string>;
  // 操作
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  toggleDisplayMode: () => void;
  // ...
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('useCalendar must be used within CalendarProvider');
  return context;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  // 集中管理状态
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [displayMode, setDisplayMode] = useState<'avatar' | 'name'>('avatar');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // 使用 useCallback 稳定回调
  const goToNextMonth = useCallback(() => {
    setSelectedDates(new Set());
    setCurrentMonth(addMonths);
  }, []);

  const value = useMemo(() => ({
    currentMonth,
    displayMode,
    selectedDates,
    goToNextMonth,
    // ...
  }), [currentMonth, displayMode, selectedDates, goToNextMonth]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
```

#### 2.3 Memo 化策略

```typescript
// src/components/calendar/MonthCalendar.tsx
import { memo } from 'react';

type MonthCalendarProps = {
  month: Date;
  schedules: ScheduleWithUser[];
  // ...
};

const MonthCalendar = memo(function MonthCalendar({
  month,
  schedules,
  // ...
}: MonthCalendarProps) {
  // 组件实现
});

// src/components/calendar/CalendarCell.tsx
const CalendarCell = memo(function CalendarCell({
  date,
  schedule,
  // ...
}: CalendarCellProps) {
  // 组件实现
}, (prevProps, nextProps) => {
  // 自定义比较：只有真正关心的属性变化才重渲染
  return (
    prevProps.date === nextProps.date &&
    prevProps.schedule?.id === nextProps.schedule?.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragSource === nextProps.isDragSource
  );
});
```

### 3. RSC 重构

#### 3.1 组件分类

| 组件 | 当前 | 目标 | 理由 |
|------|------|------|------|
| Header | 'use client' | Server | 无交互状态 |
| Sidebar | 'use client' | Server | 仅链接导航 |
| ThemeToggle | 'use client' | Client (保留) | 主题切换需要状态 |
| LoginForm | 'use client' | Client (保留) | 表单交互 |
| CalendarView | 'use client' | Hybrid | 拆分为 Server + Client |
| 各种 Dialog | 'use client' | Client (保留) | 模态交互 |
| StatisticsDialog | 'use client' | Server + Client | 数据 Server，交互 Client |

#### 3.2 Hybrid 组件模式

```typescript
// src/components/calendar/CalendarView.tsx (Server Component)
import { CalendarClient } from './CalendarClient';
import { getSchedules, getAssignableUsers } from '@/app/actions/schedule';
import { requireAuth } from '@/lib/auth';

export async function CalendarView() {
  // 服务端获取初始数据
  const account = await requireAuth();
  const canManage = account.role === 'admin';

  return (
    <CalendarClient
      canManage={canManage}
      // 传递初始数据，客户端可立即渲染
    />
  );
}

// src/components/calendar/CalendarClient.tsx (Client Component)
'use client';

import { useSchedules, useAssignableUsers } from '@/hooks';

export function CalendarClient({ canManage }: { canManage: boolean }) {
  // 使用 React Query 管理数据
  const [currentMonth] = useState(new Date());
  const { data: schedules, isLoading } = useSchedules(currentMonth);
  const { data: users } = useAssignableUsers();

  // ...
}
```

### 4. 性能指标与预期收益

| 指标 | 当前 | 优化后 | 提升 |
|------|------|--------|------|
| 首屏 JS 体积 | ~150KB | ~100KB | -33% |
| 操作后数据刷新 | 全量重新获取 | 乐观更新 + 后台刷新 | 即时响应 |
| 不必要重渲染 | 高 | 低 (memo化) | -50% |
| 重复请求 | 多次 | 1次 (缓存) | -80% |
| TTI (Time to Interactive) | ~2s | ~1.2s | -40% |

## 文件变更清单

### 新增文件

```
src/
├── providers/
│   └── QueryProvider.tsx
├── hooks/
│   ├── useSchedules.ts
│   ├── useUsers.ts
│   └── useConfigOptions.ts
└── components/
    └── calendar/
        ├── CalendarView.tsx
        ├── CalendarClient.tsx
        ├── MonthCalendar.tsx
        ├── CalendarHeader.tsx
        ├── CalendarLoading.tsx
        ├── context/
        │   └── CalendarContext.tsx
        └── hooks/
            ├── useCalendarData.ts
            ├── useCalendarDrag.ts
            └── useCalendarSelection.ts
```

### 修改文件

```
src/
├── app/
│   └── layout.tsx              # 添加 QueryProvider
├── components/
│   ├── Header.tsx              # 移除 'use client'
│   ├── Sidebar.tsx             # 移除 'use client'
│   └── CalendarView.tsx        # 重构/删除
└── lib/
    └── db.ts                   # 添加 unstable_cache
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 大规模重构引入 bug | 高 | 分阶段实施，每阶段完整测试 |
| React Query 学习曲线 | 中 | 封装自定义 hook，统一使用模式 |
| RSC/Client 边界问题 | 中 | 明确标记组件类型，文档说明 |
| 乐观更新数据不一致 | 中 | 保留后台刷新机制，错误时回滚 |

## 实施顺序

1. **Phase 1: 数据层** - 安装 TanStack Query，创建 Provider 和基础 hooks
2. **Phase 2: 组件拆分** - 拆分 CalendarView，创建 Context 和自定义 hooks
3. **Phase 3: Memoization** - 为关键组件添加 memo/useMemo/useCallback
4. **Phase 4: RSC 重构** - 将静态组件改为服务端组件
5. **Phase 5: 测试验证** - 运行完整测试套件，性能基准测试

## 验收标准

- [ ] 所有现有测试通过
- [ ] 首屏加载时间减少 30%+
- [ ] 操作响应时间 < 100ms（乐观更新）
- [ ] 无功能回归
- [ ] Lighthouse 性能分数 > 90

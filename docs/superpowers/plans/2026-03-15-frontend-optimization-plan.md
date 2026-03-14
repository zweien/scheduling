# 前端视觉优化实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对值班排班系统进行全面的视觉和交互优化，采用现代简约风格，冷灰蓝主色调，丰富动画。

**Architecture:** 采用分层优化策略：P0 基础视觉（配色+字体+日历单元格）→ P1 核心交互（拖拽+Header+动画）→ P2 对话框优化（统计+日志+空状态）。每个阶段完成后可独立验证。

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react, date-fns, @dnd-kit

---

## 文件结构

### 新建文件
- `src/lib/avatar.ts` - 头像颜色生成工具函数

### 修改文件
| 文件 | 职责 |
|------|------|
| `src/app/globals.css` | 配色变量、动画 keyframes、工具类 |
| `src/app/layout.tsx` | 字体引入（Noto Sans SC） |
| `src/components/CalendarCell.tsx` | 头像式布局、状态样式、拖拽视觉 |
| `src/components/CalendarView.tsx` | 月份切换动画、单元格交错入场 |
| `src/components/Header.tsx` | 图标按钮、分组布局、Action Sheet |
| `src/components/Sidebar.tsx` | 卡片样式、遮罩模糊、图标标题 |
| `src/components/StatisticsDialog.tsx` | 柱状图、本月/全部切换 |
| `src/components/LogDialog.tsx` | 时间线、日期分组、颜色编码 |
| `src/components/UserList.tsx` | 空状态 |
| `src/components/ListView.tsx` | 空状态 |

---

## Chunk 1: P0 - 基础视觉（配色 + 字体）

### Task 1: 更新配色方案

**Files:**
- Modify: `src/app/globals.css:50-117`

- [ ] **Step 1: 更新 :root 配色变量**

```css
:root {
  /* 主色调 - 冷灰蓝 */
  --primary: oklch(0.50 0.12 250);
  --primary-foreground: oklch(0.98 0 0);

  /* 强调色 - 青色点缀 */
  --accent: oklch(0.65 0.10 200);
  --accent-foreground: oklch(0.15 0 0);

  /* 背景层级 */
  --background: oklch(0.985 0.002 250);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* 次要 */
  --secondary: oklch(0.96 0.005 250);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.96 0.005 250);
  --muted-foreground: oklch(0.50 0 0);

  /* 边框和分割 */
  --border: oklch(0.90 0.008 250);
  --input: oklch(0.90 0.008 250);
  --ring: oklch(0.50 0.12 250);

  /* 功能色 */
  --destructive: oklch(0.577 0.245 27.325);
  --success: oklch(0.65 0.15 145);
  --warning: oklch(0.75 0.15 85);

  /* 图表色 */
  --chart-1: oklch(0.50 0.12 250);
  --chart-2: oklch(0.60 0.12 220);
  --chart-3: oklch(0.55 0.10 200);
  --chart-4: oklch(0.45 0.12 260);
  --chart-5: oklch(0.40 0.10 240);

  --radius: 0.625rem;

  /* Sidebar */
  --sidebar: oklch(0.985 0.002 250);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.50 0.12 250);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.96 0.005 250);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.90 0.008 250);
  --sidebar-ring: oklch(0.50 0.12 250);
}
```

- [ ] **Step 2: 更新 .dark 配色变量**

```css
.dark {
  --primary: oklch(0.65 0.12 250);
  --primary-foreground: oklch(0.15 0 0);
  --background: oklch(0.15 0.005 250);
  --foreground: oklch(0.98 0 0);
  --card: oklch(0.20 0.005 250);
  --card-foreground: oklch(0.98 0 0);
  --popover: oklch(0.20 0.005 250);
  --popover-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.26 0.008 250);
  --secondary-foreground: oklch(0.98 0 0);
  --muted: oklch(0.26 0.008 250);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.26 0.008 250);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.55 0.12 250);
  --chart-1: oklch(0.65 0.12 250);
  --chart-2: oklch(0.60 0.12 220);
  --chart-3: oklch(0.55 0.10 200);
  --chart-4: oklch(0.50 0.12 260);
  --chart-5: oklch(0.45 0.10 240);
  --sidebar: oklch(0.20 0.005 250);
  --sidebar-foreground: oklch(0.98 0 0);
  --sidebar-primary: oklch(0.65 0.12 250);
  --sidebar-primary-foreground: oklch(0.15 0 0);
  --sidebar-accent: oklch(0.26 0.008 250);
  --sidebar-accent-foreground: oklch(0.98 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.55 0.12 250);
}
```

- [ ] **Step 3: 验证配色生效**

Run: `bun dev`
Expected: 打开 http://localhost:3000，登录后看到蓝色主题

- [ ] **Step 4: 提交配色更改**

```bash
git add src/app/globals.css
git commit -m "feat: update color scheme to cool gray-blue theme"
```

---

### Task 2: 更换字体为思源黑体

**Files:**
- Modify: `src/app/layout.tsx:1-30`

- [ ] **Step 1: 引入 Noto Sans SC 字体**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "值班排班系统",
  description: "小团队值班排班管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansSC.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 更新 globals.css 字体变量引用**

在 `@theme inline` 中确认 `--font-sans: var(--font-sans);` 已存在（无需修改）

- [ ] **Step 3: 验证字体加载**

Run: `bun dev`
Expected: 页面使用思源黑体，检查 Network 面板看到 fonts.googleapis.com 请求

- [ ] **Step 4: 提交字体更改**

```bash
git add src/app/layout.tsx
git commit -m "feat: replace Geist with Noto Sans SC font"
```

---

### Task 3: 添加动画 keyframes 和工具类

**Files:**
- Modify: `src/app/globals.css` (追加内容)

- [ ] **Step 1: 在 globals.css 末尾添加动画定义**

```css
/* === 动画系统 === */

/* 今日脉冲光晕 - 使用 CSS 变量自动适配亮暗模式 */
:root {
  --glow-color: oklch(0.50 0.12 250);
}
.dark {
  --glow-color: oklch(0.65 0.12 250);
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 var(--glow-color) / 0.3; }
  50% { box-shadow: 0 0 0 6px var(--glow-color) / 0; }
}

/* 页面淡入 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 月份切换 */
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 单元格交错入场 */
@keyframes cellReveal {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* 拖拽释放确认 - 使用 CSS 变量 */
@keyframes dropConfirm {
  0% { box-shadow: 0 0 0 0 var(--glow-color) / 0.5; }
  100% { box-shadow: 0 0 0 8px var(--glow-color) / 0; }
}

/* 工具类 */
.animate-pulse-glow {
  animation: pulseGlow 2s ease-in-out infinite;
}

.animate-fade-in {
  animation: fadeIn 200ms ease-out forwards;
}

.animate-slide-left {
  animation: slideInLeft 200ms ease-out forwards;
}

.animate-slide-right {
  animation: slideInRight 200ms ease-out forwards;
}

.animate-cell-reveal {
  animation: cellReveal 150ms ease-out forwards;
}

.animate-drop-confirm {
  animation: dropConfirm 300ms ease-out forwards;
}

/* 数字等宽 */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: 验证动画可用**

Run: `bun dev`
Expected: 无 CSS 语法错误

- [ ] **Step 3: 提交动画定义**

```bash
git add src/app/globals.css
git commit -m "feat: add animation keyframes and utility classes"
```

---

### Task 4: 创建头像颜色工具函数

**Files:**
- Create: `src/lib/avatar.ts`

- [ ] **Step 1: 创建 avatar.ts**

```typescript
// src/lib/avatar.ts

/**
 * 基于用户名生成稳定的 HSL 色相
 * 使用 DJB2 哈希变体算法
 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

/**
 * 获取用户名首字作为头像显示
 */
export function getAvatarInitial(name: string): string {
  return name.charAt(0);
}
```

- [ ] **Step 2: 提交工具函数**

```bash
git add src/lib/avatar.ts
git commit -m "feat: add avatar color utility functions"
```

---

## Chunk 2: P0 - 日历单元格头像式改造

### Task 5: 重构 CalendarCell 组件

**Files:**
- Modify: `src/components/CalendarCell.tsx`

- [ ] **Step 1: 重写 CalendarCell 组件**

```tsx
// src/components/CalendarCell.tsx
'use client';

import type { ScheduleWithUser } from '@/types';
import { getAvatarColor, getAvatarInitial } from '@/lib/avatar';
import { Plus } from 'lucide-react';

interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  isToday: boolean;
  onClick: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragSource?: boolean;
  isDropTarget?: boolean;
  animationDelay?: number;
}

export function CalendarCell({
  date,
  schedule,
  isToday,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDragSource = false,
  isDropTarget = false,
  animationDelay = 0,
}: CalendarCellProps) {
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
        relative min-h-[50px] sm:min-h-[80px] p-1 sm:p-2 border rounded cursor-pointer
        transition-all duration-150
        ${isToday
          ? 'border-l-4 border-l-primary bg-primary/5 animate-pulse-glow'
          : 'border-border'}
        ${isWeekend ? 'bg-muted/30' : 'bg-background'}
        ${schedule ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}
        ${isDragSource ? 'opacity-40' : ''}
        ${isDropTarget ? 'border-2 border-dashed border-primary bg-primary/10' : ''}
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* 日期 */}
      <div className={`absolute top-1 right-1 text-xs font-medium
        ${isWeekend ? 'text-muted-foreground' : 'text-foreground'}
        ${isToday ? 'text-primary' : ''}`}>
        {day}
      </div>

      {/* 手动调整标记 */}
      {schedule?.is_manual && (
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-500" />
      )}

      {/* 头像 */}
      {schedule && (
        <div className="flex items-center justify-center h-full pt-4">
          <div
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-sm"
            style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
          >
            {getAvatarInitial(schedule.user.name)}
          </div>
        </div>
      )}

      {/* 空单元格 hover 提示 */}
      {!schedule && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证日历单元格显示**

Run: `bun dev`
Expected: 日历显示头像式单元格，今日有脉冲光晕

- [ ] **Step 3: 提交 CalendarCell 更改**

```bash
git add src/components/CalendarCell.tsx
git commit -m "feat: redesign CalendarCell with avatar style and visual states"
```

---

### Task 6: 更新 CalendarView 添加动画和拖拽状态

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: 添加月份切换动画和拖拽状态管理**

```tsx
// src/components/CalendarView.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarCell } from './CalendarCell';
import { UserSelectDialog } from './UserSelectDialog';
import { getSchedules, replaceSchedule, swapSchedules } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  refreshKey: number;
}

type SlideDirection = 'none' | 'left' | 'right';

export function CalendarView({ refreshKey }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('none');
  const prevMonthRef = useRef<Date>(currentMonth);

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

  const goToPrevMonth = () => {
    prevMonthRef.current = currentMonth;
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentMonth(subMonths(currentMonth, 1));
      setSlideDirection('none');
    }, 50);
  };

  const goToNextMonth = () => {
    prevMonthRef.current = currentMonth;
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentMonth(addMonths(currentMonth, 1));
      setSlideDirection('none');
    }, 50);
  };

  const goToToday = () => {
    prevMonthRef.current = currentMonth;
    const direction = currentMonth < today ? 'left' : 'right';
    setSlideDirection(direction);
    setTimeout(() => {
      setCurrentMonth(today);
      setSlideDirection('none');
    }, 50);
  };

  const slideClass = slideDirection === 'left' ? 'animate-slide-left' :
                     slideDirection === 'right' ? 'animate-slide-right' : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </h2>
        <div className="flex gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">上月</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <span className="hidden sm:inline mr-1">下月</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-0.5 sm:gap-1 ${slideClass}`}>
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const schedule = schedules.find(s => s.date === dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const animationDelay = Math.min(index * 8, 200);

          if (!isCurrentMonth) {
            return (
              <div key={dateStr} className="min-h-[50px] sm:min-h-[80px] p-1 sm:p-2 border rounded border-border bg-muted/30 opacity-50">
                <div className="text-xs sm:text-sm text-muted-foreground">{format(day, 'd')}</div>
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
              isDragSource={dragDate === dateStr}
              isDropTarget={dragDate !== null && dragDate !== dateStr}
              animationDelay={animationDelay}
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

- [ ] **Step 2: 验证月份切换动画**

Run: `bun dev`
Expected: 点击上月/下月按钮有滑动动画效果

- [ ] **Step 3: 提交 CalendarView 更改**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: add month slide animation and drag state to CalendarView"
```

---

## Chunk 3: P1 - Header 工具栏优化

### Task 7: 重构 Header 组件

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: 重写 Header 组件（图标按钮 + 分组布局）**

```tsx
// src/components/Header.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './ThemeToggle';
import {
  Menu,
  BarChart3,
  History,
  Printer,
  Download,
  Key,
  LogOut,
  Calendar,
  List,
  MoreVertical,
  X,
} from 'lucide-react';

type ViewMode = 'calendar' | 'list';

interface HeaderProps {
  onToggleSidebar: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShowStats: () => void;
  onShowLogs: () => void;
  onShowPassword: () => void;
  onShowPrint: () => void;
  onShowExport: () => void;
}

export function Header({
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  onShowStats,
  onShowLogs,
  onShowPassword,
  onShowPrint,
  onShowExport,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { label: '统计', icon: BarChart3, onClick: onShowStats },
    { label: '日志', icon: History, onClick: onShowLogs },
    { label: '打印', icon: Printer, onClick: onShowPrint },
    { label: '导出', icon: Download, onClick: onShowExport },
    { label: '改密', icon: Key, onClick: onShowPassword },
  ];

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
      {/* 品牌区 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8">
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-base sm:text-lg font-semibold truncate">值班排班系统</h1>
      </div>

      {/* 桌面端：视图切换 + 操作区 */}
      <div className="hidden md:flex items-center gap-3">
        {/* 主题切换 */}
        <ThemeToggle />

        {/* 视图切换 */}
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none gap-1"
          >
            <Calendar className="w-4 h-4" />
            月历
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-none gap-1"
          >
            <List className="w-4 h-4" />
            列表
          </Button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-border" />

        {/* 操作按钮 */}
        {menuItems.map(item => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            onClick={item.onClick}
            className="gap-1.5"
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden lg:inline">{item.label}</span>
          </Button>
        ))}

        {/* 退出 */}
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-destructive hover:text-destructive">
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">退出</span>
          </Button>
        </form>
      </div>

      {/* 移动端：紧凑布局 */}
      <div className="flex md:hidden items-center gap-1">
        <ThemeToggle />

        {/* 视图切换 */}
        <div className="flex border rounded overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none h-8 w-8"
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('list')}
            className="rounded-none h-8 w-8"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* 更多菜单 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
          </Button>

          {/* Action Sheet 风格菜单 */}
          {menuOpen && (
            <>
              {/* 遮罩 */}
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setMenuOpen(false)}
              />

              {/* 菜单面板 */}
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl p-4 z-50 animate-fade-in">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {menuItems.map(item => (
                    <button
                      key={item.label}
                      onClick={() => { item.onClick(); setMenuOpen(false); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <item.icon className="w-6 h-6 text-primary" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>

                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors"
                  >
                    退出登录
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 验证 Header 布局**

Run: `bun dev`
Expected: 桌面端显示图标按钮，移动端点击更多显示底部 Action Sheet

- [ ] **Step 3: 提交 Header 更改**

```bash
git add src/components/Header.tsx
git commit -m "feat: redesign Header with icon buttons and mobile Action Sheet"
```

---

### Task 8: 优化 Sidebar 样式

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: 更新 Sidebar 组件**

```tsx
// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserList } from '@/components/UserList';
import { ScheduleGenerator } from '@/components/ScheduleGenerator';
import { Users, CalendarPlus } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onScheduleGenerated: () => void;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onScheduleGenerated, onClose }: SidebarProps) {
  return (
    <>
      {/* 侧边栏 */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-background border-r
          transform transition-transform duration-300 ease-out
          lg:relative
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                人员管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserList />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary" />
                生成排班
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleGenerator onGenerated={onScheduleGenerated} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 移动端遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: 提交 Sidebar 更改**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: improve Sidebar with icons and backdrop blur"
```

---

## Chunk 4: P2 - 对话框优化

### Task 9: 优化 StatisticsDialog

**Files:**
- Modify: `src/components/StatisticsDialog.tsx`

- [ ] **Step 1: 重写 StatisticsDialog（柱状图 + 本月/全部切换）**

```tsx
// src/components/StatisticsDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStats } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import { getAvatarColor } from '@/lib/avatar';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface StatisticsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface StatItem {
  userId: number;
  userName: string;
  count: number;
}

type TimeRange = 'month' | 'all';

export function StatisticsDialog({ open, onClose }: StatisticsDialogProps) {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    if (open) {
      loadStats();
      getUsers().then(data => setUserCount(data.length));
    }
  }, [open, timeRange]);

  const loadStats = async () => {
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (timeRange === 'month') {
      const now = new Date();
      startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    }

    const statsData = await getStats(startDate, endDate);
    setStats(statsData);
  };

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const mostDuty = sortedStats[0];
  const leastDuty = sortedStats[sortedStats.length - 1];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>值班统计</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 时间范围切换 */}
          <div className="flex border rounded-lg p-1">
            <button
              onClick={() => setTimeRange('month')}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              本月
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              全部
            </button>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-primary/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-primary tabular-nums">{totalCount}</div>
              <div className="text-sm text-muted-foreground">总值班次数</div>
            </div>
            <div className="bg-success/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-success tabular-nums">{userCount}</div>
              <div className="text-sm text-muted-foreground">值班人数</div>
            </div>
          </div>

          {/* 柱状图 */}
          {stats.length > 0 && (
            <>
              <div className="text-sm font-medium text-foreground">人员对比</div>
              <div className="space-y-3">
                {stats.map(stat => (
                  <div key={stat.userId} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: getAvatarColor(stat.userName) }}
                        >
                          {stat.userName.charAt(0)}
                        </div>
                        <span>{stat.userName}</span>
                      </div>
                      <span className="font-medium tabular-nums">{stat.count} 次</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(stat.count / maxCount) * 100}%`,
                          backgroundColor: getAvatarColor(stat.userName),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 最值对比 */}
              {mostDuty && leastDuty && (
                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                  <div className="bg-warning/10 p-3 rounded-lg">
                    <div className="text-warning text-xs mb-1">最多值班</div>
                    <div className="font-medium">{mostDuty.userName}</div>
                    <div className="text-muted-foreground tabular-nums">{mostDuty.count} 次</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">最少值班</div>
                    <div className="font-medium">{leastDuty.userName}</div>
                    <div className="text-muted-foreground tabular-nums">{leastDuty.count} 次</div>
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

- [ ] **Step 2: 验证统计对话框**

Run: `bun dev`
Expected: 点击统计，显示本月/全部切换，柱状图颜色与头像一致

- [ ] **Step 3: 提交 StatisticsDialog 更改**

```bash
git add src/components/StatisticsDialog.tsx
git commit -m "feat: improve StatisticsDialog with bar charts and time range toggle"
```

---

### Task 10: 优化 LogDialog

**Files:**
- Modify: `src/components/LogDialog.tsx`

- [ ] **Step 1: 重写 LogDialog（时间线 + 日期分组）**

```tsx
// src/components/LogDialog.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLogList } from '@/app/actions/logs';
import type { Log } from '@/types';
import { format, parseISO, isToday, isYesterday, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface LogDialogProps {
  open: boolean;
  onClose: () => void;
}

const actionConfig: Record<string, { label: string; color: string }> = {
  login: { label: '登录', color: 'text-success' },
  logout: { label: '退出', color: 'text-success' },
  add_user: { label: '添加人员', color: 'text-primary' },
  delete_user: { label: '删除人员', color: 'text-destructive' },
  reorder_users: { label: '调整排序', color: 'text-primary' },
  generate_schedule: { label: '生成排班', color: 'text-primary' },
  replace_schedule: { label: '替换值班', color: 'text-primary' },
  swap_schedule: { label: '交换值班', color: 'text-primary' },
  set_password: { label: '修改密码', color: 'text-primary' },
};

export function LogDialog({ open, onClose }: LogDialogProps) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (open) {
      getLogList().then(setLogs);
    }
  }, [open]);

  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: Log[] }[] = [
      { label: '今天', logs: [] },
      { label: '昨天', logs: [] },
      { label: '更早', logs: [] },
    ];

    logs.forEach(log => {
      const logDate = parseISO(log.created_at);
      if (isToday(logDate)) {
        groups[0].logs.push(log);
      } else if (isYesterday(logDate)) {
        groups[1].logs.push(log);
      } else {
        groups[2].logs.push(log);
      }
    });

    return groups.filter(g => g.logs.length > 0);
  }, [logs]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>操作日志</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <div className="border-2 border-dashed rounded-lg p-6">
                暂无操作记录
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedLogs.map(group => (
                <div key={group.label}>
                  <div className="text-xs font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {group.label}
                  </div>

                  {/* 时间线 */}
                  <div className="relative pl-6 space-y-4">
                    {/* 竖线 */}
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

                    {group.logs.map(log => {
                      const config = actionConfig[log.action] || { label: log.action, color: 'text-primary' };
                      return (
                        <div key={log.id} className="relative">
                          {/* 圆点 */}
                          <div className={`absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background`} />

                          <div className="border rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-start gap-2">
                              <div className={`font-medium ${config.color}`}>
                                {config.label}
                              </div>
                              <div className="text-muted-foreground text-xs shrink-0">
                                {format(parseISO(log.created_at), 'HH:mm', { locale: zhCN })}
                              </div>
                            </div>
                            <div className="mt-1 text-foreground">{log.target}</div>
                            {log.old_value && log.new_value && (
                              <div className="mt-2 bg-muted/50 p-2 rounded text-xs space-y-1">
                                <div><span className="text-destructive">旧值：</span>{log.old_value}</div>
                                <div><span className="text-success">新值：</span>{log.new_value}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

- [ ] **Step 2: 验证日志对话框**

Run: `bun dev`
Expected: 日志显示时间线样式，按今天/昨天/更早分组

- [ ] **Step 3: 提交 LogDialog 更改**

```bash
git add src/components/LogDialog.tsx
git commit -m "feat: improve LogDialog with timeline and date grouping"
```

---

### Task 11: 添加空状态设计

**Files:**
- Modify: `src/components/UserList.tsx`
- Modify: `src/components/ListView.tsx`

- [ ] **Step 1: 更新 UserList 空状态**

在 `UserList.tsx` 的 `SortableContext` 内部添加空状态判断：

```tsx
// 在 <div className="space-y-1 max-h-48 overflow-y-auto"> 内部
{users.length === 0 ? (
  <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
    添加第一位值班人员
  </div>
) : (
  users.map(user => (
    <SortableItem key={user.id} user={user} onDelete={handleDelete} />
  ))
)}
```

- [ ] **Step 2: 更新 ListView 空状态**

在 `ListView.tsx` 中修改空状态显示：

```tsx
{schedules.length === 0 ? (
  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
    <p className="text-sm">暂无排班数据</p>
    <p className="text-xs mt-1">点击左侧生成排班开始</p>
  </div>
) : (
  // 现有列表内容
)}
```

- [ ] **Step 3: 验证空状态显示**

Run: `bun dev`
Expected: 无人员时显示空状态提示

- [ ] **Step 4: 提交空状态更改**

```bash
git add src/components/UserList.tsx src/components/ListView.tsx
git commit -m "feat: add empty state design for UserList and ListView"
```

---

## Chunk 5: 最终验证

### Task 12: 全面测试和最终提交

- [ ] **Step 1: 运行开发服务器验证所有功能**

Run: `bun dev`
检查项：
- [ ] 配色为冷灰蓝主题
- [ ] 字体为思源黑体
- [ ] 日历单元格显示头像
- [ ] 今日单元格有脉冲光晕
- [ ] 拖拽有视觉反馈
- [ ] 月份切换有滑动动画
- [ ] Header 使用图标按钮
- [ ] 移动端显示 Action Sheet
- [ ] 统计对话框有柱状图和切换
- [ ] 日志对话框有时间线
- [ ] 空状态显示正确

- [ ] **Step 2: 运行 lint 检查**

Run: `bun lint`
Expected: 无错误

- [ ] **Step 3: 构建生产版本**

Run: `bun run build`
Expected: 构建成功

- [ ] **Step 4: 最终提交（如有遗漏）**

```bash
git add -A
git commit -m "feat: complete frontend visual optimization"
```

---

## 实现顺序总结

1. **Chunk 1** - P0 基础：配色 → 字体 → 动画 → 工具函数
2. **Chunk 2** - P0 日历：CalendarCell → CalendarView
3. **Chunk 3** - P1 交互：Header → Sidebar
4. **Chunk 4** - P2 对话框：StatisticsDialog → LogDialog → 空状态
5. **Chunk 5** - 验证：全面测试 → 构建

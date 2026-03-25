# Issue #23: 视觉深度与层级 (Visual Depth & Hierarchy) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过色彩层级、柔和阴影和等宽数字排版提升界面视觉精致度

**Architecture:** 修改三个组件的 CSS 样式：CalendarCell（周末/节假日背景色 + 等宽数字）、Dialog（柔和阴影）、Card（柔和阴影）

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui

---

## 文件结构

| 文件 | 修改内容 |
|------|----------|
| `src/components/CalendarCell.tsx` | 周末/节假日背景色、tabular-nums、Props 扩展 |
| `src/components/ui/dialog.tsx` | 柔和阴影替换细边框 |
| `src/components/ui/card.tsx` | 柔和阴影替换细边框 |

---

### Task 1: 更新 CalendarCell 周末背景色

**Files:**
- Modify: `src/components/CalendarCell.tsx:70`

- [ ] **Step 1: 修改周末背景色样式**

将第 70 行的 `isWeekend ? 'bg-muted/30' : 'bg-background'` 替换为冷蓝灰色方案：

```tsx
isWeekend ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-background',
```

完整的 className 修改（第 64-75 行）：

```tsx
className={cn(
  'relative rounded border p-1 transition-all duration-150 sm:min-h-[80px] sm:p-2',
  displayMode === 'name' ? 'min-h-[60px] sm:min-h-[96px]' : 'min-h-[50px]',
  canManage ? 'cursor-pointer' : 'cursor-default',
  schedule ? 'group' : '',
  isToday ? 'border-l-4 border-l-primary bg-primary/5 animate-pulse-glow' : 'border-border',
  isWeekend ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-background',
  schedule && canManage ? 'hover:-translate-y-0.5 hover:shadow-md' : '',
  isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-sm' : '',
  isDragSource ? 'opacity-40' : '',
  isDropTarget ? 'border-2 border-dashed border-primary bg-primary/10' : ''
)}
```

- [ ] **Step 2: 验证修改**

运行: `bun dev`
检查: 打开 http://localhost:3000，确认周末（周六、周日）显示为冷蓝灰色背景

---

### Task 2: 为日历数字添加 tabular-nums

**Files:**
- Modify: `src/components/CalendarCell.tsx:79-83`

- [ ] **Step 1: 修改日期数字样式**

将第 79-83 行的日期显示 div 修改，添加 `tabular-nums` 类：

```tsx
{/* 日期 */}
<div className={`absolute top-1 right-1 text-xs font-medium tabular-nums
  ${isWeekend ? 'text-muted-foreground' : 'text-foreground'}
  ${isToday ? 'text-primary' : ''}`}>
  {day}
</div>
```

- [ ] **Step 2: 验证修改**

运行: `bun dev`
检查: 日历中日期数字 1-9 和 10-31 应该等宽对齐

---

### Task 3: 添加节假日背景色支持（预留接口）

**Files:**
- Modify: `src/components/CalendarCell.tsx:11-27, 64-75`

- [ ] **Step 1: 扩展 CalendarCellProps 接口**

在第 26 行后添加两个可选属性：

```tsx
interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  isToday: boolean;
  isSelected?: boolean;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragSource?: boolean;
  isDropTarget?: boolean;
  animationDelay?: number;
  displayMode?: 'avatar' | 'name';
  canManage?: boolean;
  isHoliday?: boolean;      // 新增
  holidayName?: string;     // 新增
}
```

- [ ] **Step 2: 解构新增的 props**

在第 44 行 `canManage = true,` 后添加：

```tsx
  isHoliday = false,
  holidayName,
}: CalendarCellProps) {
```

- [ ] **Step 3: 添加节假日样式**

在 className 的 cn() 调用中，在 `isDropTarget` 行后添加节假日样式：

```tsx
className={cn(
  'relative rounded border p-1 transition-all duration-150 sm:min-h-[80px] sm:p-2',
  displayMode === 'name' ? 'min-h-[60px] sm:min-h-[96px]' : 'min-h-[50px]',
  canManage ? 'cursor-pointer' : 'cursor-default',
  schedule ? 'group' : '',
  isToday ? 'border-l-4 border-l-primary bg-primary/5 animate-pulse-glow' : 'border-border',
  isWeekend ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-background',
  isHoliday ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : '',
  schedule && canManage ? 'hover:-translate-y-0.5 hover:shadow-md' : '',
  isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-sm' : '',
  isDragSource ? 'opacity-40' : '',
  isDropTarget ? 'border-2 border-dashed border-primary bg-primary/10' : ''
)}
```

- [ ] **Step 4: 添加节假日名称显示（可选）**

在手动调整标记后（第 88 行后），添加节假日名称显示：

```tsx
{/* 节假日标记 */}
{isHoliday && holidayName && (
  <div className="absolute bottom-1 left-1 right-1 text-[8px] text-blue-700 dark:text-blue-300 text-center truncate">
    {holidayName}
  </div>
)}
```

- [ ] **Step 5: 验证修改**

运行: `bun run build`
预期: 编译成功，无 TypeScript 错误

---

### Task 4: 更新 Dialog 组件阴影样式

**Files:**
- Modify: `src/components/ui/dialog.tsx:55-56`

- [ ] **Step 1: 修改 DialogContent 阴影**

将第 55-56 行的样式从 `ring-1 ring-foreground/10` 改为柔和阴影：

原代码：
```tsx
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
```

修改为：
```tsx
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-sm shadow-lg ring-1 ring-black/5 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
```

- [ ] **Step 2: 验证修改**

运行: `bun dev`
检查: 打开任意 Dialog（如点击日历单元格），确认显示柔和阴影效果

---

### Task 5: 更新 Card 组件阴影样式

**Files:**
- Modify: `src/components/ui/card.tsx:14-15`

- [ ] **Step 1: 修改 Card 阴影**

将第 14-15 行的样式从 `ring-1 ring-foreground/10` 改为柔和阴影：

原代码：
```tsx
"group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
```

修改为：
```tsx
"group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground shadow-sm ring-1 ring-black/5 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
```

- [ ] **Step 2: 验证修改**

运行: `bun dev`
检查: 查看使用 Card 组件的页面，确认显示柔和阴影效果

---

### Task 6: 最终验证与提交

**Files:**
- 所有修改的文件

- [ ] **Step 1: 运行构建验证**

运行: `bun run build`
预期: 构建成功，无错误

- [ ] **Step 2: 运行 lint 检查**

运行: `bun lint`
预期: 无 lint 错误

- [ ] **Step 3: 手动验收测试**

在浏览器中检查：
1. 周末单元格使用冷蓝灰色背景 `#f1f5f9`
2. 日历日期数字等宽对齐
3. Dialog 显示柔和阴影
4. Card 显示柔和阴影
5. 切换到暗色模式，确认效果正常

- [ ] **Step 4: 提交所有修改**

```bash
git add src/components/CalendarCell.tsx src/components/ui/dialog.tsx src/components/ui/card.tsx
git commit -m "feat(ui): 实现视觉深度与层级改进 (Issue #23)

- 周末单元格使用冷蓝灰色背景 (slate-100/slate-800)
- 添加节假日背景色支持接口 (blue-50/blue-900)
- 日历数字启用 tabular-nums 等宽对齐
- Dialog 和 Card 组件使用柔和阴影

Closes #23

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 验收清单

- [ ] 周末单元格使用冷蓝灰色背景，与工作日有明显区分
- [ ] 节假日单元格支持浅蓝色背景（当提供 `isHoliday` prop 时）
- [ ] Dialog 组件显示柔和阴影
- [ ] Card 组件显示柔和阴影
- [ ] 日历中所有日期数字等宽对齐
- [ ] 暗色模式下效果正常
- [ ] 不影响现有功能和交互
- [ ] 构建和 lint 通过

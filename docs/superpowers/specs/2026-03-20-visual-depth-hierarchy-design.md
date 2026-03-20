# Issue #23: 视觉深度与层级 (Visual Depth & Hierarchy)

## 概述

利用现代 CSS 特性提升界面的精致度，通过色彩层级、柔和阴影和等宽数字排版改善视觉体验。

## 设计决策

### 1. 周末与节假日背景色

**选择方案**: 冷蓝灰色（与项目主题色系一致）

| 类型 | 背景色 | 边框色 | 文字色 |
|------|--------|--------|--------|
| 周末 | `#f1f5f9` (slate-100) | `#e2e8f0` (slate-200) | `#64748b` (slate-500) |
| 节假日 | `#eff6ff` (blue-50) | `#bfdbfe` (blue-200) | `#1e40af` (blue-800) |

**暗色模式适配**:
| 类型 | 背景色 | 边框色 | 文字色 |
|------|--------|--------|--------|
| 周末 | `#1e293b` (slate-800) | `#334155` (slate-700) | `#94a3b8` (slate-400) |
| 节假日 | `#1e3a5f` (blue-900) | `#1e40af` (blue-800) | `#93c5fd` (blue-300) |

### 2. Dialog 与 Card 柔和阴影

**选择方案**: 柔和阴影 + 极细边框轮廓

替换现有的 `ring-1 ring-foreground/10` 为：
- `shadow-sm` - 柔和的多层阴影
- `ring-1 ring-black/5` - 极细的边框轮廓（可选，用于增强边界感）

**CSS 实现**:
```css
/* shadow-sm 等效 */
box-shadow:
  0 1px 2px 0 rgb(0 0 0 / 0.05),
  0 1px 3px 0 rgb(0 0 0 / 0.1);
```

**暗色模式**: 阴影颜色调整为 `rgb(0 0 0 / 0.25)` 以保持可见性。

### 3. 日历数字等宽对齐

**选择方案**: 启用 `tabular-nums`

为日历单元格中的日期数字添加 `font-variant-numeric: tabular-nums`，确保所有数字等宽对齐。

**实现方式**:
- 使用 Tailwind 类 `tabular-nums`
- 项目已有 `.tabular-nums` 定义在 `globals.css`，直接使用即可

## 实现范围

### 修改文件

1. **`src/components/CalendarCell.tsx`**
   - 更新周末背景色：`bg-muted/30` → `bg-slate-100 dark:bg-slate-800/50`
   - 添加节假日背景色支持：`bg-blue-50 dark:bg-blue-900/30`
   - 日期数字添加 `tabular-nums` 类

2. **`src/components/ui/dialog.tsx`**
   - DialogContent: `ring-1 ring-foreground/10` → `shadow-sm ring-1 ring-black/5`

3. **`src/components/ui/card.tsx`**
   - Card: `ring-1 ring-foreground/10` → `shadow-sm ring-1 ring-black/5`

4. **`src/components/CalendarView.tsx`**
   - 传递节假日信息到 CalendarCell（可选，预留接口）

### 节假日数据接口（预留）

```typescript
interface Holiday {
  date: string;      // YYYY-MM-DD
  name: string;      // 节假日名称，如 "国庆节"
}

// CalendarCell props 扩展
interface CalendarCellProps {
  // ... 现有 props
  isHoliday?: boolean;
  holidayName?: string;
}
```

节假日数据源不在本次实现范围内，仅预留接口。

## 不包含的内容

- 节假日数据源配置
- 其他 UI 组件的样式修改
- 新增动画效果（属于 Issue #21 范围）

## 验收标准

1. 周末单元格使用冷蓝灰色背景，与工作日有明显区分
2. 节假日单元格使用浅蓝色背景（当提供 `isHoliday` prop 时）
3. Dialog 和 Card 组件显示柔和阴影，边框感减弱
4. 日历中所有日期数字等宽对齐
5. 暗色模式下效果正常
6. 不影响现有功能和交互

## 关联 Issue

- GitHub Issue: #23
- 相关 Issue: #21 (交互反馈增强)

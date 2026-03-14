# 前端视觉优化设计文档

## 概述

对值班排班系统进行全面的视觉和交互优化，采用现代简约风格，冷灰蓝主色调，丰富动画，提升整体用户体验。

## 设计方向

| 维度 | 选择 |
|------|------|
| 风格 | 现代简约 |
| 主色调 | 冷灰蓝 |
| 字体 | 思源黑体（Noto Sans SC） |
| 动画 | 丰富（月份滑动、交错动画等） |
| 日历 | 头像式单元格 |

## 配色方案

基于冷灰蓝调性，使用 OKLCH 色彩空间：

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
  --muted: oklch(0.96 0.005 250);
  --card: oklch(1 0 0);

  /* 边框和分割 */
  --border: oklch(0.90 0.008 250);

  /* 功能色 */
  --destructive: oklch(0.577 0.245 27.325);
  --success: oklch(0.65 0.15 145);
  --warning: oklch(0.75 0.15 85);
}

.dark {
  --primary: oklch(0.65 0.12 250);
  --primary-foreground: oklch(0.15 0 0);
  --background: oklch(0.15 0.005 250);
  --muted: oklch(0.22 0.008 250);
  --card: oklch(0.20 0.005 250);
  --border: oklch(0.30 0.008 250);
}
```

## 字体设置

使用 Google Fonts 的思源黑体：

```tsx
// layout.tsx
import { Noto_Sans_SC } from "next/font/google";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
```

字号规范：
- `text-xs` (12px)：辅助信息、时间戳
- `text-sm` (14px)：正文
- `text-base` (16px)：重要正文
- `text-lg` (18px)：小标题
- `text-xl` (20px)：页面标题

## 组件设计

### 1. 日历单元格（CalendarCell）

**布局**：
```
┌──────────────┐
│  15          │  ← 日期（右上角）
│    ┌───┐     │
│    │ 张 │    │  ← 圆形头像（姓名首字）
│    └───┘     │
│              │
└──────────────┘
```

**状态样式**：
| 状态 | 样式 |
|------|------|
| 今日 | 蓝色左边框 4px + 浅蓝背景 + 脉冲光晕 |
| 周末 | 背景稍暗 (muted) |
| 手动调整 | 右上角橙色小圆点 |
| 空单元格 | hover 时显示 "+" 图标 |

**头像生成**：
- 背景色：基于用户名 hash 生成稳定 HSL 色相
- 尺寸：桌面 32px / 移动端 24px
- 文字：白色，居中，姓名首字

**交互**：
- Hover：`translateY(-2px)` + 阴影增强
- 拖拽中：`opacity: 0.4`
- 拖拽目标：虚线蓝色边框

### 2. Header 工具栏

**布局分组**：
```
┌─────────────────────────────────────────────────────────────┐
│ ☰  值班排班系统     │  🌙 📅月历|列表  │  📊 📋 🖨️ 📤 🔐 ⬅️  │
│    [品牌区]          │    [视图切换]    │      [操作区]      │
└─────────────────────────────────────────────────────────────┘
```

**图标映射**：
| 功能 | 图标 (lucide-react) |
|------|---------------------|
| 统计 | BarChart3 |
| 日志 | History |
| 打印 | Printer |
| 导出 | Download |
| 改密 | Key |
| 退出 | LogOut |
| 主题 | Sun/Moon |
| 菜单 | Menu |

**移动端**：
- 操作区收起到 "更多" 图标
- 使用 Action Sheet 替代下拉菜单

### 3. 统计对话框（StatisticsDialog）

**优化点**：
- 柱状图替代进度条
- 柱状图颜色与用户头像色一致
- 添加"本月/全部"切换标签
- 数字使用 tabular-nums 等宽

### 4. 日志对话框（LogDialog）

**优化点**：
- 左侧时间线（蓝色圆点 + 竖线）
- 按日期分组（今天/昨天/更早）
- 操作类型颜色编码：
  - 登录/退出：绿色
  - 删除：红色
  - 其他：蓝色

### 5. 侧边栏（Sidebar）

**优化点**：
- 卡片圆角 `rounded-lg`
- 标题添加小图标（Users / CalendarPlus）
- 移动端遮罩添加 `backdrop-blur-sm`

### 6. 空状态

| 场景 | 文案 |
|------|------|
| 日历无排班 | "点击左侧生成排班开始" |
| 人员列表为空 | "添加第一位值班人员" |
| 日志为空 | "暂无操作记录" |

样式：虚线框 + 灰色文案 + 可选操作按钮

## 动画系统

### 页面级动画

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
/* duration: 200ms, 应用于主内容区 */
```

### 日历动画

```css
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
/* 每个单元格 delay = index * 10ms，最大 300ms */
```

### 对话框动画

```css
/* 开启 */
@keyframes dialogIn {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 关闭 */
@keyframes dialogOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

### 微交互

| 元素 | 动画 | 时长 |
|------|------|------|
| 按钮 hover | 背景色过渡 | 150ms |
| 单元格 hover | 上浮 2px + 阴影 | 150ms |
| 侧边栏展开 | transform | 300ms |
| 遮罩 | opacity | 200ms |

## 拖拽交互

**视觉反馈**：
1. 拖拽开始：原单元格 opacity 0.4
2. 拖拽中：显示拖拽预览浮层（人员名 + 日期）
3. 拖拽目标：虚线蓝色边框 + 浅蓝背景
4. 释放后：短暂闪烁确认动画

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/app/globals.css` | 配色变量、动画 keyframes |
| `src/app/layout.tsx` | 字体引入 |
| `src/components/CalendarCell.tsx` | 头像式布局、状态样式、交互 |
| `src/components/CalendarView.tsx` | 月份切换动画、单元格交错入场 |
| `src/components/Header.tsx` | 图标按钮、分组布局、移动端 Action Sheet |
| `src/components/Sidebar.tsx` | 卡片样式、遮罩模糊 |
| `src/components/StatisticsDialog.tsx` | 柱状图、切换标签 |
| `src/components/LogDialog.tsx` | 时间线、日期分组 |
| `src/components/UserList.tsx` | 空状态 |
| `src/components/ListView.tsx` | 空状态 |

## 实现优先级

1. **P0 - 基础视觉**
   - 配色方案更新
   - 字体更换
   - 日历单元格头像式改造

2. **P1 - 核心交互**
   - 拖拽视觉反馈
   - Header 工具栏优化
   - 动画系统

3. **P2 - 对话框优化**
   - 统计对话框柱状图
   - 日志对话框时间线
   - 空状态设计

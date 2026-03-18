# Issue #25 无障碍首版改进设计

## 背景

当前系统已经具备基础的组件结构，但在键盘操作、可访问名称和自定义交互语义上仍有明显缺口。典型问题包括：

- 公共弹窗关闭按钮仍使用英文 `Close`
- Header 中多个图标按钮缺少明确的可访问名称
- 移动端更多菜单缺少展开状态语义
- 自定义月历右键菜单只有基础 `role`，但缺少更完整的键盘与焦点行为

这些问题会直接影响键盘用户和读屏用户完成主流程，不适合继续累积。

## 目标

首版只解决“基础可操作性”，不做整站无障碍一次性重构。目标如下：

1. 关键图标按钮具备明确、稳定的中文可访问名称
2. 弹窗可通过键盘完成打开、关闭和焦点回退
3. 自定义右键菜单具备基础菜单语义，并支持 `Esc` 关闭
4. 移动端更多菜单和关键切换按钮正确暴露状态

## 非目标

本次明确不包含：

- 全站颜色对比度系统性整改
- 所有表单错误提示与描述文本全面关联
- 复杂的读屏播报优化
- 移动端长按手势或新的导航模式
- 全量页面逐个做无障碍清单式整改

## 范围

### 1. 公共弹窗组件

优先改造 [src/components/ui/dialog.tsx](/home/z/scheduling/src/components/ui/dialog.tsx)：

- 关闭按钮的隐藏文本统一改为中文，如“关闭对话框”
- Footer 中默认关闭按钮文案改为中文“关闭”
- 保持现有 Base UI 焦点陷阱能力，不重写弹窗状态机

设计原则：

- 公共组件修一次，多处弹窗收益
- 不额外引入新依赖

### 2. Header 高优先级按钮语义

改造 [src/components/Header.tsx](/home/z/scheduling/src/components/Header.tsx)：

- 侧边栏开关按钮补 `aria-label`
- 桌面端和移动端月历/列表切换按钮补明确名称
- 移动端“更多菜单”按钮补 `aria-label`、`aria-expanded`、`aria-controls`
- 主题切换按钮补清晰可访问名称和当前状态表达

设计原则：

- 图标按钮不能只依赖视觉图标表达含义
- 状态切换控件应让读屏用户知道当前状态

### 3. 月历右键菜单基础语义

改造 [src/components/CalendarContextMenu.tsx](/home/z/scheduling/src/components/CalendarContextMenu.tsx)：

- 保留现有 `role="menu"` / `role="menuitem"`
- 打开菜单后支持 `Esc` 关闭
- 打开时将焦点移入菜单，避免键盘用户“菜单已开但焦点仍停留在原位置”
- 关闭后将焦点返回触发该菜单的日期格或按钮

首版不做：

- 菜单内方向键循环导航
- 完整 roving tabindex
- 触屏端长按菜单

## 组件落点

### 必改组件

- [src/components/ui/dialog.tsx](/home/z/scheduling/src/components/ui/dialog.tsx)
- [src/components/Header.tsx](/home/z/scheduling/src/components/Header.tsx)
- [src/components/CalendarContextMenu.tsx](/home/z/scheduling/src/components/CalendarContextMenu.tsx)

### 视情况补齐的高频弹窗

如果公共组件改造后仍存在缺口，再检查这些高频入口：

- [src/components/ScheduleImportDialog.tsx](/home/z/scheduling/src/components/ScheduleImportDialog.tsx)
- [src/components/PasswordDialog.tsx](/home/z/scheduling/src/components/PasswordDialog.tsx)
- [src/components/UserSelectDialog.tsx](/home/z/scheduling/src/components/UserSelectDialog.tsx)

原则是优先依赖公共组件收益，不做散点式重复修补。

## 验证策略

### Playwright 回归

增加代表性无障碍回归，不追求一次覆盖全部页面：

1. 弹窗打开后可通过 `Esc` 关闭
2. 关闭后焦点回到触发按钮
3. 移动端更多菜单按钮具备正确的展开状态
4. 月历右键菜单可通过 `Esc` 关闭

### 代码审查项

- 图标按钮是否具备稳定中文可访问名称
- 状态按钮是否暴露 `aria-expanded` 或同类状态属性
- 弹窗默认关闭按钮是否统一中文

## 方案取舍

本次选择“先做基础可操作性”，原因如下：

- 用户收益最高，直接改善主流程操作能力
- 改动集中在公共组件和高频入口，回归成本可控
- 不会把 `#25` 扩大成整站视觉与语义大翻修

这符合 KISS、YAGNI 和 DRY：

- KISS：先修可操作性最强的问题
- YAGNI：不提前做整站彻底无障碍重构
- DRY：优先通过公共组件一次性修复多处问题

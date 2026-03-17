# 成功操作统一提醒设计

## 背景

当前系统已经集成了全局 toast 基础设施：

- [`src/components/ui/sonner.tsx`](/home/z/scheduling/src/components/ui/sonner.tsx)
- [`src/app/layout.tsx`](/home/z/scheduling/src/app/layout.tsx)

但绝大多数写操作在成功后没有统一、明确的成功反馈。用户通常只能通过页面刷新、数据变化或对话框关闭来推断是否操作成功，交互反馈不足。

`issue #16` 要求在每次操作成功后弹出提醒。

## 目标

- 所有会改数据的成功操作都显示统一成功提醒
- 提醒文案与具体操作结果匹配
- 成功与错误反馈语义分离
- 复用现有 toast 能力，不新增第二套提示系统

## 非目标

- 不重构现有 server action 协议
- 不做全局 action 拦截层
- 不为每个成功操作都新增单独端到端测试
- 不为纯查看、查询类操作新增成功提示

## 方案选择

### 方案一：在客户端成功分支统一调用 `toast.success`

优点：

- 复用现有 toast 基础设施
- 提示文案最贴近用户交互语境
- 不需要大范围修改 action 返回结构

缺点：

- 需要逐个覆盖成功路径

### 方案二：统一改造 server action 返回 `message`

优点：

- 文案更接近业务层

缺点：

- 涉及大量 action 返回类型变更
- 容易引入额外回归

### 方案三：增加全局拦截层自动判断成功并提示

优点：

- 表面上最统一

缺点：

- 当前代码没有统一的 action 调用抽象
- 强行引入会增加复杂度，不符合 KISS / YAGNI

## 最终设计

采用方案一，在各个现有客户端组件的成功分支统一调用 `toast.success(...)`。

### 提示规则

- 仅在成功完成后显示成功提示
- 失败分支继续沿用现有错误展示方式
- 文案短小明确，直接描述结果
- 带数量或统计结果的操作可显示摘要

示例文案：

- `保存成功`
- `删除成功`
- `已删除 3 名值班人员`
- `排班已交换`
- `导入完成：新增 5 人，更新 2 人`

### 覆盖范围

#### 排班相关

- 生成排班
- 替换排班
- 删除排班
- 批量删除排班
- 交换排班
- 移动排班
- 导入排班

#### 值班人员相关

- 新增值班人员
- 编辑值班人员
- 删除单个值班人员
- 批量删除值班人员
- 启用 / 停用值班人员
- 调整值班人员顺序
- 导入值班人员

#### 账号与设置相关

- 创建账号
- 修改账号角色
- 启用 / 停用账号
- 修改密码
- 更新注册开关

#### 认证相关

- 登录成功
- 注册成功

说明：

- 退出登录不做成功 toast，因为会立即跳转，提示价值低

## 组件落点

### 主要写操作入口

- [`src/components/CalendarView.tsx`](/home/z/scheduling/src/components/CalendarView.tsx)
- [`src/components/ScheduleGenerator.tsx`](/home/z/scheduling/src/components/ScheduleGenerator.tsx)
- [`src/components/ScheduleImportDialog.tsx`](/home/z/scheduling/src/components/ScheduleImportDialog.tsx)
- [`src/components/DutyUserManagement.tsx`](/home/z/scheduling/src/components/DutyUserManagement.tsx)
- [`src/components/AccountManagement.tsx`](/home/z/scheduling/src/components/AccountManagement.tsx)
- [`src/components/PasswordDialog.tsx`](/home/z/scheduling/src/components/PasswordDialog.tsx)
- [`src/components/RegistrationSettings.tsx`](/home/z/scheduling/src/components/RegistrationSettings.tsx)
- [`src/components/LoginForm.tsx`](/home/z/scheduling/src/components/LoginForm.tsx)
- [`src/components/RegisterForm.tsx`](/home/z/scheduling/src/components/RegisterForm.tsx)

### 文案复用

允许两种方式并存：

1. 简单固定文案直接在组件内调用
2. 对带数量或统计的操作，提取最小 helper 生成文案

约束：

- 不为了“统一”而过度抽象所有文案
- 仅在重复明显的场景提取 helper

## 错误处理

- 失败时不显示成功 toast
- 成功 toast 不能掩盖已有错误提示
- 对于导入、批量删除等可能返回统计结果的操作，优先展示结果摘要

## 测试策略

### 单元验证

- 若提取文案 helper，补对应输出测试
- 覆盖数量型文案和导入摘要文案

### Playwright 回归

选择代表性成功路径验证 toast 展示：

- 生成排班成功
- 新增值班人员成功
- 批量删除值班人员成功
- 更新注册开关成功

说明：

- 不对每条成功路径都做独立 E2E，用代表路径验证 toast 机制接入正确即可

## 风险与约束

- 覆盖面较广，容易漏掉个别成功路径，需要按写操作入口逐个核查
- 如果文案抽象过度，后续维护成本会上升，因此本次坚持最小 helper 策略

## 实施原则

- KISS：直接复用现有 `toast` 基础设施
- YAGNI：不重构 action 协议，不新增全局拦截器
- DRY：对明显重复的成功文案做最小复用
- SOLID：提示逻辑放在交互组件成功分支，业务 action 继续只负责业务结果

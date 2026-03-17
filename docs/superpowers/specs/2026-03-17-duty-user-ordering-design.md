# 值班人员管理页支持调整已有人员顺序设计

## 背景

`issue #12` 需要在值班人员管理页面支持调整已有人员顺序，并将结果持久化。当前系统已经具备顺序写入能力：

- 服务层已有 `reorderUsers(userIds: number[])`
- Server Action 已有 `updateUserOrder(userIds: number[])`
- 历史组件 [`src/components/UserList.tsx`](/home/z/scheduling/src/components/UserList.tsx) 已使用 `dnd-kit` 实现过基础拖拽排序

当前缺口不在数据层，而在现行值班人员管理页 [`src/components/DutyUserManagement.tsx`](/home/z/scheduling/src/components/DutyUserManagement.tsx) 与 [`src/components/duty-users/DutyUserList.tsx`](/home/z/scheduling/src/components/duty-users/DutyUserList.tsx) 尚未接入排序交互。

## 目标

- 在值班人员管理页支持对已有人员进行拖拽排序
- 拖拽完成后立即持久化顺序
- 排序结果刷新后保持一致
- 不破坏现有筛选、批量选择、编辑、启停、删除能力

## 非目标

- 不实现独立的“排序模式”
- 不增加“上移/下移”按钮兜底方案
- 不调整排班算法本身，只保证其可继续基于既有顺序字段工作
- 不在首版支持“筛选结果子集内重排后合并回完整顺序”

## 方案选择

### 方案一：直接在当前列表上接入拖拽排序

在现有人员卡片列表中加入拖拽手柄，拖拽结束后立即调用 `updateUserOrder` 持久化。

优点：

- 复用现有数据层能力和 `dnd-kit` 依赖
- 改动范围集中，符合 KISS
- 交互与 issue 预期一致

缺点：

- 需要处理拖拽与复选框、按钮点击的事件边界
- 需要明确筛选态的处理规则

### 方案二：单独新增“排序模式”

进入排序模式后展示专用精简列表，完成后保存退出。

优点：

- 交互更纯粹，减少卡片内操作干扰

缺点：

- 新增模式切换和状态管理，复杂度偏高
- 超出首版必要范围，不符合 YAGNI

### 方案三：使用“上移/下移”按钮调整顺序

优点：

- 技术实现较简单

缺点：

- 不符合 issue 中更自然的拖拽预期
- 长列表体验差

## 最终设计

采用方案一，在当前值班人员管理页的列表中接入拖拽排序。

### 交互规则

- 仅有管理权限的用户可进行排序
- 仅在“未筛选状态”下启用拖拽排序
- 当存在任一筛选条件时：
  - 列表保留查看、编辑、启停、删除和批量选择能力
  - 拖拽排序禁用
  - 页面展示提示文案，说明需清空筛选后再调整顺序
- 每个列表项左侧增加拖拽手柄，避免整张卡片都成为拖拽区域
- 拖拽完成后立即保存，不额外增加“保存顺序”按钮

### 未筛选状态的定义

以下条件全部为空时视为未筛选状态：

- `search`
- `organization`
- `category`
- `status`

### 数据流

1. `DutyUserManagement` 继续持有 `users` 状态
2. 页面根据筛选条件计算 `canReorder`
3. `DutyUserList` 在 `canReorder=true` 时启用 `dnd-kit`
4. 拖拽结束后，`DutyUserList` 通过回调将新的 `userIds` 顺序上抛给 `DutyUserManagement`
5. `DutyUserManagement` 执行：
   - 前端本地乐观更新列表顺序
   - 调用 `updateUserOrder(userIds)`
   - 若失败则回滚到旧顺序并提示错误

### 组件职责

#### `DutyUserManagement`

- 持有用户列表、筛选条件、错误状态
- 计算是否允许排序
- 实现顺序持久化与失败回滚

#### `DutyUserList`

- 渲染列表与批量操作区
- 在允许排序时接入 `dnd-kit`
- 只负责交互，不直接调用 Server Action

#### `SortableDutyUserItem`

- 作为 `DutyUserList` 内部局部组件
- 负责单个可拖拽列表项的拖拽属性、位移样式和手柄渲染
- 不承载业务状态

## 错误处理

- 顺序保存失败时提示“顺序保存失败，请重试”
- 失败后恢复拖拽前顺序，避免前端展示与数据库状态不一致
- 拖拽过程中不影响已有编辑、启停、删除逻辑

## 测试策略

### 单元/集成验证

- 校验拖拽完成后传递给 `updateUserOrder` 的 ID 顺序正确
- 校验筛选条件存在时不进入可拖拽状态
- 校验顺序保存失败时会回滚本地顺序并提示错误

### Playwright 回归验证

- 在默认未筛选状态下展示拖拽手柄或排序提示
- 完成一次排序后刷新页面，顺序保持一致
- 应用任一筛选条件后，排序能力禁用并显示提示文案

## 风险与约束

- 首版不处理“筛选子集重排后映射回完整列表”的复杂顺序合并逻辑，这是有意的范围控制
- 如果后续明确需要在筛选态下排序，应单独设计“局部重排”规则，不能在当前实现上直接放开

## 实施原则

- KISS：直接复用现有 action 和旧拖拽模式
- YAGNI：不引入排序模式、不增加额外兜底交互
- DRY：复用现有 `dnd-kit` 结构与顺序更新接口
- SOLID：列表展示、排序交互、顺序持久化职责分离

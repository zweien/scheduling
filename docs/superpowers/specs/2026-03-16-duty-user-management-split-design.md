# 阶段 2：值班人员管理模块拆分设计

## 目标

在不改变任何用户可见行为、文案、权限规则和路由结构的前提下，拆分值班人员管理模块的前端组件和 Server Action 边界，降低单文件复杂度，提升可维护性和可测试性。

## 现状问题

- `src/components/DutyUserManagement.tsx` 同时承担数据加载、权限裁剪、筛选、表单、导入、列表展示。
- `src/app/actions/users.ts` 同时承担只读查询、写操作、模板下载、导入预检、正式导入。
- 当前职责边界不清晰，后续继续扩展值班人员管理会持续放大维护成本。

## 设计原则

- KISS：只做结构拆分，不改行为。
- YAGNI：不在本阶段拆 `src/lib/users.ts`，避免改动过深。
- DRY：容器组件集中编排状态，展示组件只接收明确 props。
- SOLID：列表、筛选、导入、表单各自单一职责；查询和写操作分文件。

## 组件拆分

保留一个薄容器：

- `src/components/DutyUserManagement.tsx`
  - 负责状态编排、数据加载、权限分发、调用 action

新增展示/交互子组件：

- `src/components/duty-users/DutyUserFilters.tsx`
- `src/components/duty-users/DutyUserImportPanel.tsx`
- `src/components/duty-users/DutyUserForm.tsx`
- `src/components/duty-users/DutyUserList.tsx`

## Action 拆分

将 `src/app/actions/users.ts` 拆为：

- `src/app/actions/users-read.ts`
  - `getUsers`
  - `getAssignableUsers`
  - `getDutyUsers`
  - `getDutyUsersForView`
- `src/app/actions/users-write.ts`
  - `addUser`
  - `createDutyUser`
  - `removeUser`
  - `updateUserOrder`
  - `updateUserActiveAction`
  - `updateDutyUserProfile`
- `src/app/actions/users-import.ts`
  - `downloadDutyUsersTemplate`
  - `previewDutyUsersImportAction`
  - `importDutyUsersAction`

现有调用方只调整 import 路径，不改变返回结构。

## 不在本阶段处理

- 不调整 `src/lib/users.ts`
- 不改页面路由
- 不改列表样式和交互
- 不补新功能

## 验证

- `npm run lint`
- `tests/duty-users-management.spec.ts`
- `tests/duty-users-import.spec.ts`
- `tests/account-permissions.spec.ts`

## 预期结果

- 行为保持不变
- 值班人员管理容器明显瘦身
- 查询/写入/导入 action 职责分离
- 为后续阶段继续拆分数据层和迁移机制打基础

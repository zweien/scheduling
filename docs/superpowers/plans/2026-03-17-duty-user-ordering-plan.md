# 值班人员排序实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在值班人员管理页支持对已有人员进行拖拽排序，并在未筛选状态下立即持久化顺序。

**Architecture:** 复用现有 `updateUserOrder` Server Action 和 `dnd-kit` 拖拽能力，在 `DutyUserList` 中引入可拖拽列表项，由 `DutyUserManagement` 负责乐观更新、失败回滚和错误提示。为避免筛选态局部重排污染全量顺序，首版仅在未筛选状态下启用排序。

**Tech Stack:** Next.js App Router、React Client Components、TypeScript、Tailwind CSS、@dnd-kit、Node test、Playwright

---

## 文件结构

- 修改: `src/components/DutyUserManagement.tsx`
  - 增加排序可用性计算、顺序持久化、失败回滚和错误展示
- 修改: `src/components/duty-users/DutyUserList.tsx`
  - 接入 `dnd-kit`，新增可拖拽列表项和筛选态禁用提示
- 参考: `src/components/UserList.tsx`
  - 复用既有拖拽模式和事件边界处理思路
- 测试: `tests/duty-user-ordering.test.mjs`
  - 覆盖排序可用性规则与顺序持久化回调
- 修改: `tests/duty-user-management.spec.ts`
  - 覆盖页面排序提示、禁用态和顺序持久化回归

## Chunk 1: 排序规则与组件契约

### Task 1: 明确排序启用条件并补失败测试

**Files:**
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/duty-user-ordering.test.mjs`

- [ ] **Step 1: 写失败测试，覆盖未筛选状态才允许排序**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { canReorderDutyUsers } from '../src/components/duty-users/reorder-helpers.js';

test('filters are empty enables reorder', () => {
  assert.equal(canReorderDutyUsers({
    search: '',
    organization: '',
    category: '',
    status: '',
  }, true, 3), true);
});

test('any filter disables reorder', () => {
  assert.equal(canReorderDutyUsers({
    search: '张',
    organization: '',
    category: '',
    status: '',
  }, true, 3), false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: FAIL，提示缺少辅助方法或断言不通过

- [ ] **Step 3: 提取最小排序规则辅助方法**

在 `src/components/duty-users/` 下新增最小辅助模块，例如：

```ts
export function canReorderDutyUsers(filters, canManage, count) {
  if (!canManage || count <= 1) return false;
  return !filters.search && !filters.organization && !filters.category && !filters.status;
}
```

- [ ] **Step 4: 再次运行测试确认通过**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/duty-users/reorder-helpers.ts tests/duty-user-ordering.test.mjs src/components/DutyUserManagement.tsx
git commit -m "test: define duty user reorder rules"
```

### Task 2: 将排序可用性接入管理页状态

**Files:**
- Modify: `src/components/DutyUserManagement.tsx`

- [ ] **Step 1: 在管理页中计算 `canReorder`**

实现要点：

```ts
const canReorder = canReorderDutyUsers(filters, canManage, users.length);
```

- [ ] **Step 2: 为列表补充新契约**

向 `DutyUserList` 传递：

```ts
canReorder={canReorder}
reorderHint={canManage && !canReorder ? '请清空筛选条件后再调整顺序' : null}
```

- [ ] **Step 3: 本地类型检查和快速运行**

Run: `npm run lint`
Expected: 通过，无未使用变量和类型错误

- [ ] **Step 4: 提交**

```bash
git add src/components/DutyUserManagement.tsx
git commit -m "feat: wire reorder availability in duty user management"
```

## Chunk 2: 列表拖拽交互

### Task 3: 给列表增加拖拽失败测试

**Files:**
- Modify: `src/components/duty-users/DutyUserList.tsx`
- Test: `tests/duty-user-ordering.test.mjs`

- [ ] **Step 1: 写失败测试，覆盖排序回调收到正确 ID 顺序**

```js
test('drag reorder emits reordered ids', async () => {
  const ids = reorderUserIds([1, 2, 3], 1, 3);
  assert.deepEqual(ids, [2, 3, 1]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: FAIL，提示缺少重排辅助方法

- [ ] **Step 3: 提取最小重排辅助方法**

新增最小纯函数，避免把列表拖拽逻辑直接塞进测试：

```ts
export function reorderUserIds(ids: number[], activeId: number, overId: number) {
  const oldIndex = ids.indexOf(activeId);
  const newIndex = ids.indexOf(overId);
  return arrayMove(ids, oldIndex, newIndex);
}
```

- [ ] **Step 4: 再次运行测试确认通过**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/duty-users/reorder-helpers.ts tests/duty-user-ordering.test.mjs
git commit -m "test: cover duty user reorder id mapping"
```

### Task 4: 在 `DutyUserList` 中接入 `dnd-kit`

**Files:**
- Modify: `src/components/duty-users/DutyUserList.tsx`
- Reference: `src/components/UserList.tsx`

- [ ] **Step 1: 新增 `SortableDutyUserItem` 局部组件**

实现要点：

- 使用 `useSortable({ id: user.id })`
- 用 `CSS.Transform.toString(transform)` 应用位移
- 将拖拽监听器绑定到明确的手柄元素，不绑定整张卡片

- [ ] **Step 2: 在 `canReorder=true` 时包裹 `DndContext` 和 `SortableContext`**

实现要点：

```ts
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={users.map(user => user.id)} strategy={verticalListSortingStrategy}>
```

- [ ] **Step 3: 在 `canReorder=false` 时保留普通列表渲染**

要求：

- 不破坏现有复选框、编辑、启停、删除行为
- 当 `reorderHint` 存在时展示提示文案

- [ ] **Step 4: 运行定向验证**

Run: `npm run lint`
Expected: 通过

- [ ] **Step 5: 提交**

```bash
git add src/components/duty-users/DutyUserList.tsx src/components/duty-users/reorder-helpers.ts
git commit -m "feat: add drag sorting to duty user list"
```

## Chunk 3: 顺序持久化与回滚

### Task 5: 给管理页补顺序保存失败测试

**Files:**
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/duty-user-ordering.test.mjs`

- [ ] **Step 1: 写失败测试，覆盖失败回滚行为**

测试目标：

- `handleReorder` 调用保存动作失败时恢复旧顺序
- 暴露统一错误消息 `顺序保存失败，请重试`

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: FAIL

- [ ] **Step 3: 实现最小保存流程**

实现要点：

```ts
const previousUsers = users;
setUsers(reorderedUsers);
const result = await updateUserOrder(userIds);
if (!result?.success) {
  setUsers(previousUsers);
  setError('顺序保存失败，请重试');
}
```

- [ ] **Step 4: 再次运行测试确认通过**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/DutyUserManagement.tsx tests/duty-user-ordering.test.mjs
git commit -m "feat: persist duty user order with rollback"
```

## Chunk 4: 页面回归验证

### Task 6: 编写 Playwright 回归测试

**Files:**
- Modify: `tests/duty-user-management.spec.ts`

- [ ] **Step 1: 写页面测试，覆盖默认状态下可排序提示**

测试目标：

- 进入值班人员管理页
- 断言未筛选状态下存在排序提示或拖拽手柄标识

- [ ] **Step 2: 写页面测试，覆盖筛选态禁用排序**

测试目标：

- 输入搜索条件或选择筛选项
- 断言出现“请清空筛选条件后再调整顺序”提示

- [ ] **Step 3: 如果当前 Playwright 工具链支持，补拖拽后刷新保持顺序**

实现要点：

- 优先使用 `dragTo`
- 刷新后校验列表前两项顺序
- 若现有测试环境对拖拽稳定性不足，则至少覆盖提示和列表顺序文本变更

- [ ] **Step 4: 运行定向页面测试**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3003" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/duty-user-management.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add tests/duty-user-management.spec.ts
git commit -m "test: cover duty user ordering flows"
```

## Chunk 5: 最终校验与收尾

### Task 7: 跑完整验证并整理交付

**Files:**
- Modify: `src/components/DutyUserManagement.tsx`
- Modify: `src/components/duty-users/DutyUserList.tsx`
- Modify: `tests/duty-user-ordering.test.mjs`
- Modify: `tests/duty-user-management.spec.ts`

- [ ] **Step 1: 运行单元测试**

Run: `node --test "tests/duty-user-ordering.test.mjs"`
Expected: PASS

- [ ] **Step 2: 运行页面回归测试**

Run: `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3003" PLAYWRIGHT_PASSWORD="idrl123456" npx playwright test "tests/duty-user-management.spec.ts" "tests/login-page.spec.ts" --reporter=line --workers=1`
Expected: PASS

- [ ] **Step 3: 运行 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: 生成最终提交**

```bash
git add src/components/DutyUserManagement.tsx src/components/duty-users/DutyUserList.tsx src/components/duty-users/reorder-helpers.ts tests/duty-user-ordering.test.mjs tests/duty-user-management.spec.ts
git commit -m "feat: support duty user ordering"
```

- [ ] **Step 5: 准备提测或创建 PR**

输出内容：

- 改动摘要
- 验证命令
- 已知约束：筛选态下禁用排序

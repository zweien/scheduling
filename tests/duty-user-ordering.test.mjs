import test from 'node:test';
import assert from 'node:assert/strict';

const helperModulePath = new URL('../src/components/duty-users/reorder-helpers.ts', import.meta.url).href;

async function loadHelperModule() {
  return import(`${helperModulePath}?t=${Date.now()}-${Math.random()}`);
}

test('未筛选且有管理权限时允许排序', async () => {
  const { canReorderDutyUsers } = await loadHelperModule();

  assert.equal(canReorderDutyUsers({
    search: '',
    organization: '',
    category: '',
    status: '',
  }, true, 3), true);
});

test('存在任一筛选条件时禁用排序', async () => {
  const { canReorderDutyUsers } = await loadHelperModule();

  assert.equal(canReorderDutyUsers({
    search: '张',
    organization: '',
    category: '',
    status: '',
  }, true, 3), false);
});

test('拖拽结束后返回新的用户顺序', async () => {
  const { reorderUserIds } = await loadHelperModule();

  assert.deepEqual(reorderUserIds([1, 2, 3], 1, 3), [2, 3, 1]);
});

test('按新的用户 ID 顺序重排用户对象列表', async () => {
  const { reorderDutyUsers } = await loadHelperModule();

  const reorderedUsers = reorderDutyUsers([
    { id: 1, name: '张三', sort_order: 1 },
    { id: 2, name: '李四', sort_order: 2 },
    { id: 3, name: '王五', sort_order: 3 },
  ], [2, 3, 1]);

  assert.deepEqual(reorderedUsers.map(user => user.name), ['李四', '王五', '张三']);
});

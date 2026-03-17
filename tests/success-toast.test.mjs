import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/ui/success-toast.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

test('格式化批量删除值班人员成功文案', async () => {
  const { getDeleteDutyUsersSuccessMessage } = await loadModule();
  assert.equal(getDeleteDutyUsersSuccessMessage(3), '已删除 3 名值班人员');
});

test('格式化批量删除排班成功文案', async () => {
  const { getDeleteSchedulesSuccessMessage } = await loadModule();
  assert.equal(getDeleteSchedulesSuccessMessage(5), '已删除 5 条排班');
});

test('格式化值班人员导入成功文案', async () => {
  const { getDutyUsersImportSuccessMessage } = await loadModule();
  assert.equal(getDutyUsersImportSuccessMessage(2, 1), '导入完成：新增 2 人，更新 1 人');
});

test('格式化排班导入成功文案', async () => {
  const { getScheduleImportSuccessMessage } = await loadModule();
  assert.equal(
    getScheduleImportSuccessMessage(6, 1, 2, 0),
    '导入完成：成功 6 条，跳过 1 条，覆盖 2 条，冲突 0 条'
  );
});

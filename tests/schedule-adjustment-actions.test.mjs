import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/schedule-adjustments.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

function createDependencies(overrides = {}) {
  const schedulesByDate = new Map([
    ['2026-03-17', {
      id: 1,
      date: '2026-03-17',
      user_id: 1,
      original_user_id: 1,
      adjust_reason: null,
      is_manual: false,
      created_at: '2026-03-17 00:00:00',
      user: { id: 1, name: '张三' },
    }],
    ['2026-03-18', {
      id: 2,
      date: '2026-03-18',
      user_id: 2,
      original_user_id: 2,
      adjust_reason: null,
      is_manual: false,
      created_at: '2026-03-18 00:00:00',
      user: { id: 2, name: '李四' },
    }],
  ]);
  const writes = [];
  const deletes = [];
  const logs = [];

  return {
    getScheduleByDate(date) {
      return schedulesByDate.get(date);
    },
    setSchedule(date, userId, isManual, metadata) {
      const previous = schedulesByDate.get(date);
      writes.push({ date, userId, isManual, metadata });
      schedulesByDate.set(date, {
        id: previous?.id ?? writes.length + 100,
        date,
        user_id: userId,
        original_user_id: metadata?.originalUserId ?? previous?.original_user_id ?? userId,
        adjust_reason: metadata?.adjustReason ?? previous?.adjust_reason ?? null,
        is_manual: isManual,
        created_at: previous?.created_at ?? '2026-03-17 00:00:00',
        user: { id: userId, name: userId === 1 ? '张三' : '李四' },
      });
    },
    deleteSchedule(date) {
      deletes.push(date);
      schedulesByDate.delete(date);
    },
    addLog(entry) {
      logs.push(entry);
    },
    writes,
    deletes,
    logs,
    schedulesByDate,
    ...overrides,
  };
}

test('移动排班未传理由时失败', async () => {
  const { moveScheduleWithReason } = await loadModule();
  const deps = createDependencies();

  const result = await moveScheduleWithReason({
    fromDate: '2026-03-17',
    toDate: '2026-03-19',
    reason: '   ',
  }, deps);

  assert.deepEqual(result, {
    success: false,
    error: '请填写 10-200 字的调整理由',
  });
  assert.equal(deps.writes.length, 0);
  assert.equal(deps.logs.length, 0);
});

test('移动排班成功后保留 original_user_id 并写入 adjust_reason', async () => {
  const { moveScheduleWithReason } = await loadModule();
  const deps = createDependencies({
    getScheduleByDate(date) {
      return this.schedulesByDate.get(date);
    },
  });

  const result = await moveScheduleWithReason({
    fromDate: '2026-03-17',
    toDate: '2026-03-19',
    reason: '  临时调整夜班覆盖安排  ',
  }, deps);

  assert.equal(result.success, true);
  assert.equal(deps.writes.length, 1);
  assert.deepEqual(deps.writes[0], {
    date: '2026-03-19',
    userId: 1,
    isManual: true,
    metadata: {
      originalUserId: 1,
      adjustReason: '临时调整夜班覆盖安排',
    },
  });
  assert.deepEqual(deps.deletes, ['2026-03-17']);
  assert.equal(deps.logs[0].reason, '临时调整夜班覆盖安排');
});

test('交换排班成功后两侧保留各自 original_user_id 并记录日志理由', async () => {
  const { swapSchedulesWithReason } = await loadModule();
  const deps = createDependencies();

  deps.schedulesByDate.set('2026-03-17', {
    ...deps.schedulesByDate.get('2026-03-17'),
    original_user_id: 9,
  });
  deps.schedulesByDate.set('2026-03-18', {
    ...deps.schedulesByDate.get('2026-03-18'),
    original_user_id: 8,
  });

  const result = await swapSchedulesWithReason({
    date1: '2026-03-17',
    date2: '2026-03-18',
    reason: '互换白夜班值守安排说明',
  }, deps);

  assert.equal(result.success, true);
  assert.deepEqual(deps.writes, [
    {
      date: '2026-03-17',
      userId: 2,
      isManual: true,
      metadata: {
        originalUserId: 9,
        adjustReason: '互换白夜班值守安排说明',
      },
    },
    {
      date: '2026-03-18',
      userId: 1,
      isManual: true,
      metadata: {
        originalUserId: 8,
        adjustReason: '互换白夜班值守安排说明',
      },
    },
  ]);
  assert.equal(deps.logs[0].reason, '互换白夜班值守安排说明');
});

import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/auto-schedule.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

function createDependencies(overrides = {}) {
  const users = [
    { id: 1, name: '张三', sort_order: 1, is_active: true },
    { id: 2, name: '李四', sort_order: 2, is_active: true },
    { id: 3, name: '王五', sort_order: 3, is_active: true },
  ];
  const schedules = new Map();
  const writes = [];

  return {
    getActiveUsers() {
      return users;
    },
    getSchedulesByDateRange(startDate, endDate) {
      return [...schedules.values()]
        .filter(schedule => schedule.date >= startDate && schedule.date <= endDate)
        .sort((left, right) => left.date.localeCompare(right.date));
    },
    setSchedule(date, userId, isManual) {
      const user = users.find(item => item.id === userId);
      writes.push({ date, userId, isManual });
      schedules.set(date, {
        date,
        user_id: userId,
        user,
      });
    },
    schedules,
    writes,
    users,
    ...overrides,
  };
}

test('from_first 模式从首位启用人员开始连续排班', async () => {
  const { generateScheduleFromDate } = await loadModule();
  const deps = createDependencies();

  const result = generateScheduleFromDate('2026-03-17', 3, 'from_first', deps);

  assert.deepEqual(deps.writes, [
    { date: '2026-03-17', userId: 1, isManual: false },
    { date: '2026-03-18', userId: 2, isManual: false },
    { date: '2026-03-19', userId: 3, isManual: false },
  ]);
  assert.deepEqual(result.assigned.map(item => `${item.date}:${item.userName}`), [
    '2026-03-17:张三',
    '2026-03-18:李四',
    '2026-03-19:王五',
  ]);
});

test('continue 模式从起始日前最近排班人员的下一位开始', async () => {
  const { generateScheduleFromDate } = await loadModule();
  const deps = createDependencies();

  deps.schedules.set('2026-03-16', {
    date: '2026-03-16',
    user_id: 2,
    user: { id: 2, name: '李四' },
  });

  const result = generateScheduleFromDate('2026-03-17', 2, 'continue', deps);

  assert.deepEqual(deps.writes, [
    { date: '2026-03-17', userId: 3, isManual: false },
    { date: '2026-03-18', userId: 1, isManual: false },
  ]);
  assert.equal(result.startMode, 'continue');
});

test('目标范围存在已有排班时拒绝执行', async () => {
  const { generateScheduleFromDate } = await loadModule();
  const deps = createDependencies();

  deps.schedules.set('2026-03-18', {
    date: '2026-03-18',
    user_id: 2,
    user: { id: 2, name: '李四' },
  });

  assert.throws(
    () => generateScheduleFromDate('2026-03-17', 3, 'from_first', deps),
    /所选范围内已有排班/
  );
  assert.equal(deps.writes.length, 0);
});

test('没有启用人员时拒绝执行', async () => {
  const { generateScheduleFromDate } = await loadModule();
  const deps = createDependencies({
    getActiveUsers() {
      return [];
    },
  });

  assert.throws(
    () => generateScheduleFromDate('2026-03-17', 2, 'from_first', deps),
    /没有参与值班的人员/
  );
});

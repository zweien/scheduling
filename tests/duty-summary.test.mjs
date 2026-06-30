import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/duty-summary.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

// 使用的 2026 年已知日期（数据来源 src/lib/holidays.ts）：
//  - 2026-01-01  元旦（法定节假日）
//  - 2026-01-04  元旦调休补班（isWorkday，算工作日）
//  - 2026-01-05  周一（普通工作日）
//  - 2026-01-10  周六（普通周末）
//  - 2026-02-15  春节（法定节假日）

test('休息日分类：节假日 / 周末 / 调休补班 分别计数', async () => {
  const { summarizeDutyDates } = await loadModule();

  const summary = summarizeDutyDates([
    '2026-01-01', // 元旦（节假日）
    '2026-01-04', // 调休补班（工作日）
    '2026-01-05', // 周一（工作日）
    '2026-01-10', // 周六（周末）
    '2026-02-15', // 春节（节假日）
  ]);

  assert.equal(summary.holidayCount, 2, '元旦 + 春节 = 2 个法定节假日');
  assert.equal(summary.restDayCount, 3, '2 节假日 + 1 周末 = 3 个非工作日');
  assert.equal(summary.adjustedWorkdayCount, 1, '元旦 1 月 4 日补班');
});

test('restDays 按日期升序返回，节假日带名称、周末无名称', async () => {
  const { summarizeDutyDates } = await loadModule();

  const summary = summarizeDutyDates([
    '2026-02-15', // 春节
    '2026-01-01', // 元旦
    '2026-01-10', // 周六
  ]);

  assert.deepEqual(summary.restDays, [
    { date: '2026-01-01', name: '元旦', type: 'holiday' },
    { date: '2026-01-10', type: 'weekend' },
    { date: '2026-02-15', name: '春节', type: 'holiday' },
  ]);
});

test('调休补班日不算休息日也不算节假日', async () => {
  const { summarizeDutyDates } = await loadModule();

  const summary = summarizeDutyDates(['2026-01-04']); // 元旦补班

  assert.equal(summary.restDayCount, 0);
  assert.equal(summary.holidayCount, 0);
  assert.equal(summary.adjustedWorkdayCount, 1);
  assert.deepEqual(summary.restDays, []);
});

test('空日期列表返回零计数', async () => {
  const { summarizeDutyDates } = await loadModule();

  const summary = summarizeDutyDates([]);

  assert.equal(summary.restDayCount, 0);
  assert.equal(summary.holidayCount, 0);
  assert.equal(summary.adjustedWorkdayCount, 0);
  assert.equal(summary.restDays.length, 0);
});

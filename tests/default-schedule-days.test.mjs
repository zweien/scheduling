import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/default-schedule-days.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

test('缺少配置时回退到 21 天', async () => {
  const { DEFAULT_SCHEDULE_DAYS, parseDefaultScheduleDays } = await loadModule();

  assert.equal(DEFAULT_SCHEDULE_DAYS, 21);
  assert.equal(parseDefaultScheduleDays(undefined), 21);
  assert.equal(parseDefaultScheduleDays(''), 21);
});

test('非法配置回退到 21 天，合法配置返回最新值', async () => {
  const { parseDefaultScheduleDays } = await loadModule();

  assert.equal(parseDefaultScheduleDays('0'), 21);
  assert.equal(parseDefaultScheduleDays('-3'), 21);
  assert.equal(parseDefaultScheduleDays('abc'), 21);
  assert.equal(parseDefaultScheduleDays('14'), 14);
  assert.equal(parseDefaultScheduleDays(7), 7);
});

test('未传结束日期时按默认排班天数推导结束日期', async () => {
  const { resolveScheduleEndDate } = await loadModule();

  assert.equal(resolveScheduleEndDate('2026-04-01', undefined, 5), '2026-04-05');
});

test('显式传入结束日期时保持手动值不变', async () => {
  const { resolveScheduleEndDate } = await loadModule();

  assert.equal(resolveScheduleEndDate('2026-04-01', '2026-04-09', 5), '2026-04-09');
});

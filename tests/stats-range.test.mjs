import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/stats-range.ts', import.meta.url).href;
const load = () => import(`${modulePath}?t=${Date.now()}-${Math.random()}`);

test('显式 start+end 原样透传', async () => {
  const { resolveStatsRange } = await load();
  assert.deepEqual(
    resolveStatsRange({ start: '2026-01-01', end: '2026-12-31' }),
    { start: '2026-01-01', end: '2026-12-31' },
  );
});

test('start+end 优先级高于 year/month', async () => {
  const { resolveStatsRange } = await load();
  assert.deepEqual(
    resolveStatsRange({ start: '2026-03-01', end: '2026-03-31', month: '2026-06', year: '2027' }),
    { start: '2026-03-01', end: '2026-03-31' },
  );
});

test('month=2026-06 解析为整月范围', async () => {
  const { resolveStatsRange } = await load();
  assert.deepEqual(resolveStatsRange({ month: '2026-06' }), { start: '2026-06-01', end: '2026-06-30' });
});

test('month=2024-02（闰年）末尾为 29 日', async () => {
  const { resolveStatsRange } = await load();
  assert.deepEqual(resolveStatsRange({ month: '2024-02' }), { start: '2024-02-01', end: '2024-02-29' });
});

test('month=2026-02（平年）末尾为 28 日', async () => {
  const { resolveStatsRange } = await load();
  assert.deepEqual(resolveStatsRange({ month: '2026-02' }), { start: '2026-02-01', end: '2026-02-28' });
});

test('year=2026 解析为整年范围', async () => {
  const { resolveStatsRange } = await load();
  assert.deepEqual(resolveStatsRange({ year: '2026' }), { start: '2026-01-01', end: '2026-12-31' });
});

test('非法 month（13 月、格式错）返回 null', async () => {
  const { resolveStatsRange } = await load();
  assert.equal(resolveStatsRange({ month: '2026-13' }), null);
  assert.equal(resolveStatsRange({ month: '2026-6' }), null);
  assert.equal(resolveStatsRange({ month: 'abcd' }), null);
});

test('非法 year 返回 null', async () => {
  const { resolveStatsRange } = await load();
  assert.equal(resolveStatsRange({ year: '26' }), null);
  assert.equal(resolveStatsRange({ year: 'abcd' }), null);
});

test('什么参数都没给返回 null', async () => {
  const { resolveStatsRange } = await load();
  assert.equal(resolveStatsRange({}), null);
  assert.equal(resolveStatsRange({ start: '2026-01-01' }), null); // 只有 start 没 end
});

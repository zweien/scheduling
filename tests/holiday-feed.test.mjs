import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/holidays.ts', import.meta.url).href;
const load = () => import(`${modulePath}?t=${Date.now()}-${Math.random()}`);

test('isOffDay=true 解析为法定节假日（不带 isWorkday）', async () => {
  const { parseHolidayCnDays } = await load();
  const r = parseHolidayCnDays([{ name: '元旦', date: '2026-01-01', isOffDay: true }]);
  assert.deepEqual(r, [{ name: '元旦', date: '2026-01-01' }]);
});

test('isOffDay=false 解析为调休补班（isWorkday=true）', async () => {
  const { parseHolidayCnDays } = await load();
  const r = parseHolidayCnDays([{ name: '元旦', date: '2026-01-04', isOffDay: false }]);
  assert.deepEqual(r, [{ name: '元旦', date: '2026-01-04', isWorkday: true }]);
});

test('跳过字段缺失或日期格式错误的条目', async () => {
  const { parseHolidayCnDays } = await load();
  const r = parseHolidayCnDays([
    { name: '元旦', date: '2026-01-01', isOffDay: true },
    { name: '坏日期', date: 'not-a-date', isOffDay: true },
    { name: '缺isOffDay', date: '2026-01-02' },
    { date: '2026-01-03', isOffDay: true },
    'garbage',
    null,
  ]);
  assert.deepEqual(r, [{ name: '元旦', date: '2026-01-01' }]);
});

test('真实 holiday-cn 2026 片段：元旦假期 + 补班解析正确', async () => {
  const { parseHolidayCnDays } = await load();
  const r = parseHolidayCnDays([
    { name: '元旦', date: '2026-01-01', isOffDay: true },
    { name: '元旦', date: '2026-01-02', isOffDay: true },
    { name: '元旦', date: '2026-01-03', isOffDay: true },
    { name: '元旦', date: '2026-01-04', isOffDay: false },
  ]);
  assert.equal(r.length, 4);
  assert.equal(r[0].isWorkday, undefined); // 假期
  assert.equal(r[3].isWorkday, true);      // 补班
});

import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/export/calendar-markdown.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

test('按周一到周日输出 markdown 月历并保留空白补位', async () => {
  const { buildMonthlyCalendarMarkdown } = await loadModule();

  const markdown = buildMonthlyCalendarMarkdown('2026-03', [
    {
      id: 1,
      date: '2026-03-16',
      user_id: 1,
      original_user_id: 1,
      adjust_reason: null,
      is_manual: false,
      created_at: '2026-03-16 00:00:00',
      user: {
        id: 1,
        name: '张三',
        sort_order: 1,
        is_active: 1,
        created_at: '2026-03-16 00:00:00',
      },
      original_user: null,
    },
  ]);

  const lines = markdown.split('\n');

  assert.equal(lines[0], '# 2026年3月值班表');
  assert.equal(lines[2], '| 周一 | 周二 | 周三 | 周四 | 周五 | 周六 | 周日 |');
  assert.equal(lines[3], '| --- | --- | --- | --- | --- | --- | --- |');
  assert.equal(lines[4], '|  |  |  |  |  |  | 1 |');
  assert.match(markdown, /\| 16 张三 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \|/);
  assert.equal(lines.at(-1), '| 30 | 31 |  |  |  |  |  |');
});

test('合法月份返回起止日期，供 API 层查询整月排班', async () => {
  const { getMonthDateRange } = await loadModule();

  assert.deepEqual(getMonthDateRange('2026-03'), {
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  });
});

test('非法月份返回空结果，供 API 层判定为 400', async () => {
  const { getMonthDateRange } = await loadModule();

  assert.equal(getMonthDateRange('2026-13'), null);
  assert.equal(getMonthDateRange('202603'), null);
});

test('非法月份构建 markdown 时抛错，供 API 层转换为 400', async () => {
  const { buildMonthlyCalendarMarkdown } = await loadModule();

  assert.throws(() => buildMonthlyCalendarMarkdown('2026-13', []), /Invalid month/);
});

test('姓名包含 markdown 特殊字符或换行时会被清洗，避免打坏月历表格', async () => {
  const { buildMonthlyCalendarMarkdown } = await loadModule();

  const markdown = buildMonthlyCalendarMarkdown('2026-03', [
    {
      id: 1,
      date: '2026-03-16',
      user_id: 1,
      original_user_id: 1,
      adjust_reason: null,
      is_manual: false,
      created_at: '2026-03-16 00:00:00',
      user: {
        id: 1,
        name: '张|三\n值班',
        sort_order: 1,
        is_active: 1,
        created_at: '2026-03-16 00:00:00',
      },
      original_user: null,
    },
  ]);

  assert.match(markdown, /\| 16 张\\\|三 值班 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \|/);
  assert.equal(markdown.includes('\n值班 | 17 |'), false);
});

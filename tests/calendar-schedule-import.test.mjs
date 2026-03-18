import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

const modulePath = new URL('../src/lib/imports/calendar-schedule-import.js', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

async function createCalendarWorkbookBuffer(weeks) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('值班表');

  sheet.addRow([]);
  sheet.addRow(['2026年3月值班表']);
  sheet.addRow(['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']);

  for (const week of weeks) {
    const dateRow = ['日期'];
    const userRow = ['值班员'];

    for (const cell of week) {
      if (!cell) {
        dateRow.push('');
        userRow.push('');
        continue;
      }

      dateRow.push(cell.serial);
      userRow.push(cell.userName);
    }

    sheet.addRow(dateRow);
    sheet.addRow(userRow);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

test('月历模板可解析首周和末周不完整的单月排班', async () => {
  const { parseCalendarScheduleImport } = await loadModule();
  const buffer = await createCalendarWorkbookBuffer([
    [
      null,
      null,
      null,
      null,
      null,
      { serial: 46082, userName: '张三' },
      { serial: 46083, userName: '李四' },
    ],
    [
      { serial: 46084, userName: '王五' },
      { serial: 46085, userName: '张三' },
      { serial: 46086, userName: '李四' },
      { serial: 46087, userName: '王五' },
      { serial: 46088, userName: '张三' },
      { serial: 46089, userName: '李四' },
      { serial: 46090, userName: '王五' },
    ],
    [
      { serial: 46112, userName: '张三' },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ]);

  const result = await parseCalendarScheduleImport(buffer);

  assert.equal(result.rows.length, 10);
  assert.deepEqual(result.rows[0], {
    rowNumber: 5,
    date: '2026-03-01',
    userName: '张三',
    isManual: true,
    notes: '',
  });
  assert.deepEqual(result.rows.at(-1), {
    rowNumber: 9,
    date: '2026-03-31',
    userName: '张三',
    isManual: true,
    notes: '',
  });
  assert.equal(result.issues.length, 0);
});

test('月历模板中重复日期会报错', async () => {
  const { parseCalendarScheduleImport } = await loadModule();
  const buffer = await createCalendarWorkbookBuffer([
    [
      { serial: 46084, userName: '张三' },
      { serial: 46084, userName: '李四' },
      null,
      null,
      null,
      null,
      null,
    ],
  ]);

  const result = await parseCalendarScheduleImport(buffer);

  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].message, /重复日期/);
});

test('月历模板中空姓名会被忽略，不作为错误处理', async () => {
  const { parseCalendarScheduleImport } = await loadModule();
  const buffer = await createCalendarWorkbookBuffer([
    [
      { serial: 46084, userName: '' },
      { serial: 46085, userName: '张三' },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ]);

  const result = await parseCalendarScheduleImport(buffer);

  assert.equal(result.issues.length, 0);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    rowNumber: 5,
    date: '2026-03-04',
    userName: '张三',
    isManual: true,
    notes: '',
  });
});

test('月历模板中跨月日期会报错', async () => {
  const { parseCalendarScheduleImport } = await loadModule();
  const buffer = await createCalendarWorkbookBuffer([
    [
      { serial: 46082, userName: '张三' },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      { serial: 46113, userName: '李四' },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ]);

  const result = await parseCalendarScheduleImport(buffer);

  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].message, /同一个自然月/);
});

test('月历模板解析结果可被现有导入链路预检并识别人名匹配问题', async () => {
  const importModulePath = new URL('../src/lib/imports/schedule-import.ts', import.meta.url).href;
  const { previewScheduleImport } = await import(`${importModulePath}?t=${Date.now()}-${Math.random()}`);
  const buffer = await createCalendarWorkbookBuffer([
    [
      null,
      null,
      null,
      null,
      null,
      { serial: 46082, userName: '张三' },
      { serial: 46083, userName: '不存在的人' },
    ],
  ]);

  const preview = await previewScheduleImport(
    buffer,
    {
      getUserByName(name) {
        return name === '张三' ? { id: 1, name: '张三' } : undefined;
      },
      getSchedulesByDates() {
        return [];
      },
    },
    'calendar'
  );

  assert.equal(preview.totalRows, 2);
  assert.equal(preview.validRows, 1);
  assert.equal(preview.issues.length, 1);
  assert.equal(preview.issues[0].row, 5);
  assert.match(preview.issues[0].message, /系统中不存在该值班人员/);
});

test('月历模板坏文件会返回解析错误，而不是直接抛异常', async () => {
  const { parseCalendarScheduleImport } = await loadModule();

  const result = await parseCalendarScheduleImport(Buffer.from('invalid-file'));

  assert.equal(result.rows.length, 0);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].message, /无法解析导入文件/);
});

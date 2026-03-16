import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

const templateModulePath = new URL('../src/lib/imports/schedule-import-template.ts', import.meta.url).href;
const importModulePath = new URL('../src/lib/imports/schedule-import.ts', import.meta.url).href;

async function loadTemplateModule() {
  return import(`${templateModulePath}?t=${Date.now()}-${Math.random()}`);
}

async function loadImportModule() {
  return import(`${importModulePath}?t=${Date.now()}-${Math.random()}`);
}

async function createWorkbookBuffer(rows, options = {}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('排班导入模板');
  const headers = options.headers ?? ['日期（必填，YYYY-MM-DD）', '值班人员姓名（必填）', '是否手动调整（必填，是/否）', '备注（选填）'];
  sheet.addRow(headers);
  sheet.addRow(['2026-03-20', '张三', '否', '示例']);
  for (const row of rows) {
    sheet.addRow(row);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createDependencies(overrides = {}) {
  const usersByName = new Map([
    ['张三', { id: 1, name: '张三' }],
    ['李四', { id: 2, name: '李四' }],
    ['王五', { id: 3, name: '王五' }],
  ]);
  const schedulesByDate = new Map([
    ['2026-03-21', { date: '2026-03-21', user_id: 1, is_manual: false, user: { id: 1, name: '张三' } }],
  ]);
  const writes = [];

  return {
    getUserByName(name) {
      return usersByName.get(name);
    },
    getSchedulesByDates(dates) {
      return dates.map(date => schedulesByDate.get(date)).filter(Boolean);
    },
    setSchedule(date, userId, isManual) {
      writes.push({ date, userId, isManual });
      schedulesByDate.set(date, {
        date,
        user_id: userId,
        is_manual: isManual,
        user: { id: userId, name: [...usersByName.values()].find(user => user.id === userId)?.name ?? '未知' },
      });
    },
    writes,
    ...overrides,
  };
}

test('排班导入模板包含预期表头', async () => {
  const { buildScheduleImportTemplateWorkbook } = await loadTemplateModule();

  const workbookBuffer = await buildScheduleImportTemplateWorkbook();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(workbookBuffer);
  const sheet = workbook.worksheets[0];

  const headers = sheet.getRow(1).values.slice(1, 5);
  assert.deepEqual(headers, [
    '日期（必填，YYYY-MM-DD）',
    '值班人员姓名（必填）',
    '是否手动调整（必填，是/否）',
    '备注（选填）',
  ]);
});

test('预检会识别文件内重复、姓名缺失和系统冲突', async () => {
  const { previewScheduleImport } = await loadImportModule();
  const buffer = await createWorkbookBuffer([
    ['2026-03-21', '李四', '是', '与系统冲突'],
    ['2026-03-22', '', '否', '姓名为空'],
    ['2026-03-23', '王五', '否', '正常'],
    ['2026-03-23', '张三', '否', '文件内重复'],
  ]);

  const preview = await previewScheduleImport(buffer, createDependencies());

  assert.equal(preview.totalRows, 4);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].date, '2026-03-21');
  assert.equal(preview.issues.length, 2);
  assert.equal(preview.duplicateRows, 1);
  assert.equal(preview.invalidRows, 2);
});

test('skip 策略只导入无冲突记录', async () => {
  const { importScheduleRows } = await loadImportModule();
  const buffer = await createWorkbookBuffer([
    ['2026-03-21', '李四', '是', '与系统冲突'],
    ['2026-03-22', '王五', '否', '正常导入'],
  ]);
  const deps = createDependencies();

  const result = await importScheduleRows(buffer, 'skip', deps);

  assert.equal(result.success, true);
  assert.equal(result.importedCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.equal(deps.writes.length, 1);
  assert.deepEqual(deps.writes[0], { date: '2026-03-22', userId: 3, isManual: false });
});

test('overwrite 策略会覆盖系统已有日期', async () => {
  const { importScheduleRows } = await loadImportModule();
  const buffer = await createWorkbookBuffer([
    ['2026-03-21', '李四', '是', '覆盖导入'],
  ]);
  const deps = createDependencies();

  const result = await importScheduleRows(buffer, 'overwrite', deps);

  assert.equal(result.success, true);
  assert.equal(result.importedCount, 1);
  assert.equal(result.overwrittenCount, 1);
  assert.deepEqual(deps.writes[0], { date: '2026-03-21', userId: 2, isManual: true });
});

test('mark_conflicts 策略只返回冲突清单，不执行写入', async () => {
  const { importScheduleRows } = await loadImportModule();
  const buffer = await createWorkbookBuffer([
    ['2026-03-21', '李四', '是', '仅标记冲突'],
    ['2026-03-22', '王五', '否', '不应写入'],
  ]);
  const deps = createDependencies();

  const result = await importScheduleRows(buffer, 'mark_conflicts', deps);

  assert.equal(result.success, true);
  assert.equal(result.importedCount, 0);
  assert.equal(result.conflictCount, 1);
  assert.equal(result.markedOnly, true);
  assert.equal(deps.writes.length, 0);
});

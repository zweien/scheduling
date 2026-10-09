import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

const migrationsModulePath = new URL('../src/lib/db/migrations.ts', import.meta.url).href;
const seedModulePath = new URL('../src/lib/db/seed.ts', import.meta.url).href;

async function loadMigrationsModule() {
  return import(`${migrationsModulePath}?t=${Date.now()}-${Math.random()}`);
}

async function loadSeedModule() {
  return import(`${seedModulePath}?t=${Date.now()}-${Math.random()}`);
}

function getColumnNames(database, tableName) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map(column => column.name);
}

test('applyMigrations creates schema_migrations and records executed versions', async () => {
  const { applyMigrations, MIGRATIONS } = await loadMigrationsModule();
  const database = new Database(':memory:');

  applyMigrations(database);

  const versions = database
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map(row => row.version);

  assert.deepEqual(versions, [...MIGRATIONS].map(m => m.version).sort());
});

test('applyMigrations upgrades legacy schema with missing profile and audit columns', async () => {
  const { applyMigrations } = await loadMigrationsModule();
  const database = new Database(':memory:');

  database.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  applyMigrations(database);

  assert.deepEqual(
    getColumnNames(database, 'users'),
    ['id', 'name', 'sort_order', 'created_at', 'organization', 'category', 'notes', 'is_active']
  );
  assert.deepEqual(
    getColumnNames(database, 'accounts'),
    [
      'id',
      'username',
      'display_name',
      'password_hash',
      'created_at',
      'role',
      'is_active',
      'dingtalk_open_id',
      'dingtalk_union_id',
      'dingtalk_nick',
      'auth_provider',
    ]
  );
  assert.deepEqual(
    getColumnNames(database, 'logs'),
    ['id', 'action', 'target', 'old_value', 'new_value', 'created_at', 'operator_username', 'operator_role', 'ip_address', 'source', 'reason']
  );
  assert.deepEqual(
    getColumnNames(database, 'api_tokens'),
    ['id', 'name', 'token_hash', 'token_prefix', 'created_at', 'last_used_at', 'disabled_at', 'account_id']
  );
});

test('applyMigrations adds schedule adjustment and log reason columns', async () => {
  const { applyMigrations } = await loadMigrationsModule();
  const database = new Database(':memory:');

  applyMigrations(database);

  const scheduleColumns = getColumnNames(database, 'schedules');
  const logColumns = getColumnNames(database, 'logs');

  assert(scheduleColumns.includes('original_user_id'));
  assert(scheduleColumns.includes('adjust_reason'));
  assert(logColumns.includes('reason'));
});

test('全新数据库按版本号顺序完成迁移（依赖 accounts 的 010 在 001 之后执行）', async () => {
  const { applyMigrations } = await loadMigrationsModule();
  const database = new Database(':memory:');

  applyMigrations(database);

  const accountColumns = getColumnNames(database, 'accounts');
  assert(accountColumns.includes('dingtalk_open_id'), '010 的钉钉字段应已应用');
  assert(accountColumns.includes('role'), '003 的角色字段应已应用');

  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map(row => row.name);
  for (const table of ['users', 'accounts', 'schedules', 'logs', 'api_tokens', 'game_scores', 'date_notes', 'leaders', 'leader_schedules']) {
    assert(tables.includes(table), `缺少表 ${table}`);
  }
});

test('seedDatabase creates default config and admin account idempotently', async () => {
  const { applyMigrations } = await loadMigrationsModule();
  const { seedDatabase } = await loadSeedModule();
  const database = new Database(':memory:');

  applyMigrations(database);
  seedDatabase(database, { hashPassword: value => `hash:${value}` });
  seedDatabase(database, { hashPassword: value => `hash:${value}` });

  const password = database.prepare('SELECT value FROM config WHERE key = ?').get('password');
  const registrationEnabled = database.prepare('SELECT value FROM config WHERE key = ?').get('registration_enabled');
  const defaultScheduleDays = database.prepare('SELECT value FROM config WHERE key = ?').get('default_schedule_days');
  const adminAccounts = database.prepare('SELECT username, role, is_active FROM accounts WHERE username = ?').all('admin');

  assert.equal(password.value, '123456');
  assert.equal(registrationEnabled.value, 'false');
  assert.equal(defaultScheduleDays.value, '21');
  assert.equal(adminAccounts.length, 1);
  assert.deepEqual(adminAccounts[0], { username: 'admin', role: 'admin', is_active: 1 });
});

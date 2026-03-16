import type Database from 'better-sqlite3';

type SeedDependencies = {
  hashPassword?: (password: string) => string;
};

function ensureConfigValue(database: Database.Database, key: string, value: string) {
  const existing = database.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  if (!existing) {
    database.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run(key, value);
  }
}

export function ensureDefaultAdminAccount(database: Database.Database, initialPassword: string, dependencies: SeedDependencies = {}) {
  const hashPassword = dependencies.hashPassword ?? ((password: string) => password);
  database.prepare(`
    INSERT OR IGNORE INTO accounts (username, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, 'admin', 1)
  `).run('admin', '管理员', hashPassword(initialPassword));
}

export function seedDatabase(database: Database.Database, dependencies: SeedDependencies = {}) {
  ensureConfigValue(database, 'password', '123456');
  ensureConfigValue(database, 'registration_enabled', 'false');

  const legacyPassword = database.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;
  ensureDefaultAdminAccount(database, legacyPassword?.value || '123456', dependencies);
}

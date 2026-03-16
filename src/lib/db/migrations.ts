import type Database from 'better-sqlite3';

type Migration = {
  version: string;
  up: (database: Database.Database) => void;
};

function ensureMigrationsTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function addColumnIfMissing(database: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (columns.some(column => column.name === columnName)) {
    return;
  }

  try {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes(`duplicate column name: ${columnName}`)) {
      return;
    }

    throw error;
  }
}

export const MIGRATIONS: Migration[] = [
  {
    version: '001_initial_schema',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          is_manual INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          target TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS api_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          token_prefix TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_used_at DATETIME,
          disabled_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: '002_users_profile_fields',
    up(database) {
      addColumnIfMissing(database, 'users', 'organization', "TEXT NOT NULL DEFAULT 'W'");
      addColumnIfMissing(database, 'users', 'category', "TEXT NOT NULL DEFAULT 'W'");
      addColumnIfMissing(database, 'users', 'notes', "TEXT DEFAULT ''");
      addColumnIfMissing(database, 'users', 'is_active', 'INTEGER DEFAULT 1');
    },
  },
  {
    version: '003_accounts_fields',
    up(database) {
      addColumnIfMissing(database, 'accounts', 'role', "TEXT NOT NULL DEFAULT 'user'");
      addColumnIfMissing(database, 'accounts', 'is_active', 'INTEGER DEFAULT 1');
    },
  },
  {
    version: '004_logs_audit_fields',
    up(database) {
      addColumnIfMissing(database, 'logs', 'operator_username', 'TEXT');
      addColumnIfMissing(database, 'logs', 'operator_role', 'TEXT');
      addColumnIfMissing(database, 'logs', 'ip_address', 'TEXT');
      addColumnIfMissing(database, 'logs', 'source', 'TEXT');
    },
  },
];

export function applyMigrations(database: Database.Database) {
  ensureMigrationsTable(database);

  const applied = new Set(
    (database.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as Array<{ version: string }>)
      .map(row => row.version)
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }

    const transaction = database.transaction(() => {
      migration.up(database);
      database.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run(migration.version);
    });

    transaction();
  }
}

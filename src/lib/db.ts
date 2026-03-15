// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'scheduling.db');
const db = new Database(dbPath);

// 启用 WAL 模式
db.pragma('journal_mode = WAL');

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
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
`);

// 初始化默认密码
const defaultPassword = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined;
if (!defaultPassword) {
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('password', '123456');
}

// 检查并添加 is_active 字段（兼容已存在的数据库）
try {
  db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
} catch {
  // 字段已存在，忽略错误
}

export default db;

// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import { applyMigrations } from './db/migrations';
import { seedDatabase } from './db/seed';
import { hashPassword } from './password';

const dbPath = path.join(process.cwd(), 'data', 'scheduling.db');
const db = new Database(dbPath);

// 启用 WAL 模式
db.pragma('journal_mode = WAL');
applyMigrations(db);
seedDatabase(db, { hashPassword });

export default db;

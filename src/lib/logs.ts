// src/lib/logs.ts
import db from './db';
import type { Log, Action } from '@/types';

export function addLog(action: Action, target: string, oldValue?: string, newValue?: string): void {
  db.prepare('INSERT INTO logs (action, target, old_value, new_value) VALUES (?, ?, ?, ?)').run(
    action,
    target,
    oldValue ?? null,
    newValue ?? null
  );
}

export function getLogs(limit: number = 100): Log[] {
  return db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit) as Log[];
}

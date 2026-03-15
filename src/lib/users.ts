// src/lib/users.ts
import db from './db';
import type { User } from '@/types';

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY sort_order').all() as User[];
}

export function getActiveUsers(): User[] {
  return db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY sort_order').all() as User[];
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(name: string): User {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM users').get() as { max: number | null };
  const sortOrder = (maxOrder?.max ?? 0) + 1;
  const result = db.prepare('INSERT INTO users (name, sort_order, is_active) VALUES (?, ?, 1)').run(name, sortOrder);
  return getUserById(result.lastInsertRowid as number)!;
}

export function deleteUser(id: number): void {
  const transaction = db.transaction(() => {
    // 先删除该用户的所有排班记录
    db.prepare('DELETE FROM schedules WHERE user_id = ?').run(id);
    // 再删除用户
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  });
  transaction();
}

export function reorderUsers(userIds: number[]): void {
  const update = db.prepare('UPDATE users SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    userIds.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  transaction();
}

export function setUserActive(id: number, isActive: boolean): void {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

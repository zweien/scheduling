// src/lib/leaders.ts
import db from './db';
import type { Leader } from '@/types';

export function getAllLeaders(): Leader[] {
  return db.prepare('SELECT * FROM leaders ORDER BY sort_order').all() as Leader[];
}

export function getActiveLeaders(): Leader[] {
  return db.prepare('SELECT * FROM leaders WHERE is_active = 1 ORDER BY sort_order').all() as Leader[];
}

export function getLeaderById(id: number): Leader | undefined {
  return db.prepare('SELECT * FROM leaders WHERE id = ?').get(id) as Leader | undefined;
}

export function getLeaderByName(name: string): Leader | undefined {
  return db.prepare('SELECT * FROM leaders WHERE name = ?').get(name.trim()) as Leader | undefined;
}

export function createLeader(name: string): Leader {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM leaders').get() as { max: number | null };
  const sortOrder = (maxOrder?.max ?? 0) + 1;
  const result = db.prepare(`
    INSERT INTO leaders (name, sort_order, is_active)
    VALUES (?, ?, 1)
  `).run(name.trim(), sortOrder);
  return getLeaderById(result.lastInsertRowid as number)!;
}

export function deleteLeader(id: number): void {
  const transaction = db.transaction(() => {
    // 先删除该领导的所有排班记录
    db.prepare('DELETE FROM leader_schedules WHERE leader_id = ?').run(id);
    // 清除默认领导配置（如果被删除的是默认领导）
    db.prepare("UPDATE config SET value = '' WHERE key = 'default_leader_id' AND value = ?").run(String(id));
    // 再删除领导
    db.prepare('DELETE FROM leaders WHERE id = ?').run(id);
  });
  transaction();
}

export function reorderLeaders(leaderIds: number[]): void {
  const update = db.prepare('UPDATE leaders SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    leaderIds.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  transaction();
}

export function setLeaderActive(id: number, isActive: boolean): void {
  db.prepare('UPDATE leaders SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

export function getLeaderScheduleCount(id: number): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM leader_schedules WHERE leader_id = ?').get(id) as { count: number };
  return result.count;
}

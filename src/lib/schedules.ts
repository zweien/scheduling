// src/lib/schedules.ts
import db from './db';
import type { Schedule, ScheduleWithUser } from '@/types';
import { getUserById } from './users';

export function getScheduleByDate(date: string): ScheduleWithUser | undefined {
  const schedule = db.prepare('SELECT * FROM schedules WHERE date = ?').get(date) as Schedule | undefined;
  if (!schedule) return undefined;
  const user = getUserById(schedule.user_id);
  if (!user) return undefined;
  return { ...schedule, user };
}

export function getSchedulesByDateRange(startDate: string, endDate: string): ScheduleWithUser[] {
  const schedules = db.prepare(
    'SELECT * FROM schedules WHERE date >= ? AND date <= ? ORDER BY date'
  ).all(startDate, endDate) as Schedule[];
  return schedules.map(s => ({
    ...s,
    is_manual: Boolean(s.is_manual),
    user: getUserById(s.user_id)!
  })).filter(s => s.user);
}

export function setSchedule(date: string, userId: number, isManual: boolean = false): void {
  db.prepare(`
    INSERT INTO schedules (date, user_id, is_manual) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET user_id = ?, is_manual = ?
  `).run(date, userId, isManual ? 1 : 0, userId, isManual ? 1 : 0);
}

export function deleteSchedule(date: string): void {
  db.prepare('DELETE FROM schedules WHERE date = ?').run(date);
}

export function getScheduleStats(startDate?: string, endDate?: string): { userId: number; count: number }[] {
  let query = `
    SELECT user_id, COUNT(*) as count
    FROM schedules
  `;
  const params: string[] = [];

  if (startDate && endDate) {
    query += ' WHERE date >= ? AND date <= ?';
    params.push(startDate, endDate);
  }

  query += ' GROUP BY user_id ORDER BY count DESC';

  return db.prepare(query).all(...params) as { userId: number; count: number }[];
}

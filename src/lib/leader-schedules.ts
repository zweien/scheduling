// src/lib/leader-schedules.ts
import db from './db';
import type { LeaderSchedule, LeaderScheduleWithLeader } from '@/types';
import { getLeaderById } from './leaders';

export function getLeaderScheduleByDate(date: string): LeaderScheduleWithLeader | undefined {
  const schedule = db.prepare('SELECT * FROM leader_schedules WHERE date = ?').get(date) as LeaderSchedule | undefined;
  if (!schedule) return undefined;
  const leader = getLeaderById(schedule.leader_id);
  if (!leader) return undefined;
  return {
    ...schedule,
    is_manual: Boolean(schedule.is_manual),
    leader,
  };
}

export function getLeaderSchedulesByDateRange(startDate: string, endDate: string): LeaderScheduleWithLeader[] {
  const schedules = db.prepare(
    'SELECT * FROM leader_schedules WHERE date >= ? AND date <= ? ORDER BY date'
  ).all(startDate, endDate) as LeaderSchedule[];
  return schedules.map(s => ({
    ...s,
    is_manual: Boolean(s.is_manual),
    leader: getLeaderById(s.leader_id)!,
  })).filter(s => s.leader);
}

export function getLeaderSchedulesByDates(dates: string[]): LeaderScheduleWithLeader[] {
  if (dates.length === 0) {
    return [];
  }

  const placeholders = dates.map(() => '?').join(', ');
  const schedules = db.prepare(
    `SELECT * FROM leader_schedules WHERE date IN (${placeholders}) ORDER BY date`
  ).all(...dates) as LeaderSchedule[];

  return schedules.map(schedule => ({
    ...schedule,
    is_manual: Boolean(schedule.is_manual),
    leader: getLeaderById(schedule.leader_id)!,
  })).filter(schedule => schedule.leader);
}

export function setLeaderSchedule(date: string, leaderId: number, isManual: boolean = false): void {
  db.prepare(`
    INSERT INTO leader_schedules (date, leader_id, is_manual)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      leader_id = excluded.leader_id,
      is_manual = excluded.is_manual
  `).run(date, leaderId, isManual ? 1 : 0);
}

export function deleteLeaderSchedule(date: string): void {
  db.prepare('DELETE FROM leader_schedules WHERE date = ?').run(date);
}

export function getDefaultLeaderId(): number | null {
  const result = db.prepare("SELECT value FROM config WHERE key = 'default_leader_id'").get() as { value: string } | undefined;
  const id = result?.value ? parseInt(result.value, 10) : null;
  return id && !isNaN(id) ? id : null;
}

export function setDefaultLeaderId(id: number | null): void {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('default_leader_id', ?)").run(id ? String(id) : '');
}

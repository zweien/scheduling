// src/lib/date-notes.ts
import db from './db';

export interface DateNote {
  id: number;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function getDateNote(date: string): DateNote | undefined {
  const note = db.prepare('SELECT * FROM date_notes WHERE date = ?').get(date) as DateNote | undefined;
  return note;
}

export function getDateNotesByDateRange(startDate: string, endDate: string): DateNote[] {
  const notes = db.prepare(
    'SELECT * FROM date_notes WHERE date >= ? AND date <= ? ORDER BY date'
  ).all(startDate, endDate) as DateNote[];
  return notes;
}

export function setDateNote(date: string, content: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO date_notes (date, content, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(date, content, now, now);
}

export function deleteDateNote(date: string): void {
  db.prepare('DELETE FROM date_notes WHERE date = ?').run(date);
}

export function hasDateNote(date: string): boolean {
  const result = db.prepare('SELECT 1 FROM date_notes WHERE date = ? LIMIT 1').get(date);
  return !!result;
}

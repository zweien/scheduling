import db from './db';
import { DEFAULT_SCHEDULE_DAYS, parseDefaultScheduleDays } from './default-schedule-days';

export function getConfigValue(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setConfigValue(key: string, value: string) {
  db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function isRegistrationEnabled() {
  return getConfigValue('registration_enabled') === 'true';
}

export function setRegistrationEnabled(enabled: boolean) {
  setConfigValue('registration_enabled', enabled ? 'true' : 'false');
}

export function getDefaultScheduleDays() {
  return parseDefaultScheduleDays(getConfigValue('default_schedule_days'));
}

export function setDefaultScheduleDays(days: number) {
  const normalizedDays = Number.parseInt(String(days), 10);
  if (!Number.isFinite(normalizedDays) || normalizedDays < 1) {
    throw new Error('默认排班天数必须大于等于 1');
  }

  setConfigValue('default_schedule_days', String(normalizedDays || DEFAULT_SCHEDULE_DAYS));
}

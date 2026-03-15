import db from './db';

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


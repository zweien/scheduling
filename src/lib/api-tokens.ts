import { createHash, randomBytes } from 'crypto';
import db from './db';
import type { ApiToken } from '@/types';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function mapToken(token: ApiToken) {
  return {
    id: token.id,
    name: token.name,
    prefix: token.token_prefix,
    createdAt: token.created_at,
    lastUsedAt: token.last_used_at,
    disabledAt: token.disabled_at,
  };
}

export function createApiToken(name: string) {
  const rawToken = `sch_${randomBytes(18).toString('hex')}`;
  const prefix = rawToken.slice(0, 10);
  const result = db.prepare(
    'INSERT INTO api_tokens (name, token_hash, token_prefix) VALUES (?, ?, ?)'
  ).run(name, hashToken(rawToken), prefix);

  const token = db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(result.lastInsertRowid) as ApiToken;

  return {
    ...mapToken(token),
    token: rawToken,
  };
}

export function listApiTokens() {
  const tokens = db.prepare('SELECT * FROM api_tokens ORDER BY id DESC').all() as ApiToken[];
  return tokens.map(mapToken);
}

export function disableApiToken(id: number) {
  db.prepare(
    "UPDATE api_tokens SET disabled_at = COALESCE(disabled_at, CURRENT_TIMESTAMP) WHERE id = ?"
  ).run(id);

  const token = db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(id) as ApiToken | undefined;
  return token ? mapToken(token) : null;
}

export function verifyApiToken(token: string) {
  const stored = db.prepare('SELECT * FROM api_tokens WHERE token_hash = ?').get(hashToken(token)) as ApiToken | undefined;
  if (!stored || stored.disabled_at) {
    return null;
  }

  db.prepare('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(stored.id);

  const updated = db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(stored.id) as ApiToken;
  return mapToken(updated);
}

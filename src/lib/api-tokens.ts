import { createHash, randomBytes } from 'crypto';
import db from './db';
import type { Account, ApiToken } from '@/types';
import { getAccountById } from './accounts';

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

function getLegacyAdminAccount() {
  return db.prepare(`
    SELECT *
    FROM accounts
    WHERE role = 'admin' AND is_active = 1
    ORDER BY id ASC
    LIMIT 1
  `).get() as Account | undefined;
}

function resolveApiTokenAccount(token: ApiToken) {
  if (token.account_id) {
    return getAccountById(token.account_id);
  }

  return getLegacyAdminAccount();
}

export function createApiToken(name: string, accountId: number) {
  const rawToken = `sch_${randomBytes(18).toString('hex')}`;
  const prefix = rawToken.slice(0, 10);
  const result = db.prepare(
    'INSERT INTO api_tokens (name, token_hash, token_prefix, account_id) VALUES (?, ?, ?, ?)'
  ).run(name, hashToken(rawToken), prefix, accountId);

  const token = db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(result.lastInsertRowid) as ApiToken;

  return {
    ...mapToken(token),
    token: rawToken,
  };
}

export function listApiTokens(account: Account) {
  const tokens = (account.role === 'admin'
    ? db.prepare('SELECT * FROM api_tokens WHERE account_id = ? OR account_id IS NULL ORDER BY id DESC').all(account.id)
    : db.prepare('SELECT * FROM api_tokens WHERE account_id = ? ORDER BY id DESC').all(account.id)) as ApiToken[];
  return tokens.map(mapToken);
}

export function disableApiToken(id: number, account: Account) {
  const token = account.role === 'admin'
    ? db.prepare('SELECT * FROM api_tokens WHERE id = ? AND (account_id = ? OR account_id IS NULL)').get(id, account.id) as ApiToken | undefined
    : db.prepare('SELECT * FROM api_tokens WHERE id = ? AND account_id = ?').get(id, account.id) as ApiToken | undefined;

  if (!token) {
    return null;
  }

  db.prepare(
    'UPDATE api_tokens SET disabled_at = COALESCE(disabled_at, CURRENT_TIMESTAMP) WHERE id = ?'
  ).run(id);

  const updatedToken = db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(id) as ApiToken | undefined;
  if (!updatedToken) {
    return null;
  }

  return mapToken(updatedToken);
}

export function verifyApiToken(token: string) {
  const stored = db.prepare('SELECT * FROM api_tokens WHERE token_hash = ?').get(hashToken(token)) as ApiToken | undefined;
  if (!stored || stored.disabled_at) {
    return null;
  }

  const account = resolveApiTokenAccount(stored);
  if (!account || !account.is_active) {
    return null;
  }

  db.prepare('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(stored.id);

  const updated = db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(stored.id) as ApiToken;
  return {
    token: mapToken(updated),
    account,
  };
}

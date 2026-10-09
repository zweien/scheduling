import crypto from 'crypto';
import db from './db';
import { hashPassword, verifyPassword } from './password';
import { buildDingtalkUsername, buildDingtalkDisplayName } from './dingtalk-identity';
import type { Account, AccountRole } from '@/types';

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function getAccountById(id: number): Account | undefined {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
}

export function getAccountByUsername(username: string): Account | undefined {
  return db.prepare('SELECT * FROM accounts WHERE username = ?').get(normalizeUsername(username)) as Account | undefined;
}

export function listAccounts(): Account[] {
  return db.prepare('SELECT * FROM accounts ORDER BY role DESC, created_at ASC').all() as Account[];
}

export function createAccount(input: {
  username: string;
  displayName: string;
  password: string;
  role?: AccountRole;
  isActive?: boolean;
}): Account {
  const username = normalizeUsername(input.username);
  const displayName = input.displayName.trim();
  const passwordHash = hashPassword(input.password);
  const role = input.role ?? 'user';
  const isActive = input.isActive ?? true;

  const result = db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, displayName, passwordHash, role, isActive ? 1 : 0);

  return getAccountById(result.lastInsertRowid as number)!;
}

export function updateAccountRole(accountId: number, role: AccountRole) {
  db.prepare('UPDATE accounts SET role = ? WHERE id = ?').run(role, accountId);
  return getAccountById(accountId);
}

export function updateAccountActive(accountId: number, isActive: boolean) {
  db.prepare('UPDATE accounts SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, accountId);
  return getAccountById(accountId);
}

export function updateAccountPassword(accountId: number, newPassword: string) {
  const passwordHash = hashPassword(newPassword);
  db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(passwordHash, accountId);
}

export function verifyAccountPassword(account: Account, password: string) {
  return verifyPassword(password, account.password_hash);
}

export function countAdminAccounts() {
  const row = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE role = 'admin' AND is_active = 1").get() as { count: number };
  return row.count;
}

export function normalizeAccountUsername(username: string) {
  return normalizeUsername(username);
}

export function getAccountByDingtalkOpenId(openId: string): Account | undefined {
  return db.prepare('SELECT * FROM accounts WHERE dingtalk_open_id = ?').get(openId) as Account | undefined;
}

export function getAccountByDingtalkUnionId(unionId: string): Account | undefined {
  if (!unionId) {
    return undefined;
  }
  return db.prepare('SELECT * FROM accounts WHERE dingtalk_union_id = ?').get(unionId) as Account | undefined;
}

/** 回填钉钉身份字段（例如历史账号只有 open_id，免登登录补上 union_id） */
export function updateAccountDingtalkIdentity(
  accountId: number,
  patch: { dingtalk_open_id?: string; dingtalk_union_id?: string; dingtalk_nick?: string }
): Account {
  const fields = Object.keys(patch);
  if (fields.length > 0) {
    const assignments = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => patch[field as keyof typeof patch] as string);
    db.prepare(`UPDATE accounts SET ${assignments} WHERE id = ?`).run(...values, accountId);
  }
  return getAccountById(accountId)!;
}

export function createDingtalkAccount(userInfo: {
  openId?: string;
  unionId?: string;
  nick?: string;
  identity?: string;
}): Account {
  // identity 为账号唯一标识（扫码登录用 openId，免登用 userId）
  const identity = userInfo.identity ?? userInfo.openId ?? userInfo.unionId ?? '';
  const username = buildDingtalkUsername(identity);
  const displayName = buildDingtalkDisplayName(userInfo.nick ?? '', identity);
  const passwordHash = hashPassword(crypto.randomBytes(32).toString('hex'));

  const result = db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active, dingtalk_open_id, dingtalk_union_id, dingtalk_nick, auth_provider)
    VALUES (?, ?, ?, 'user', 1, ?, ?, ?, 'dingtalk')
  `).run(
    username,
    displayName,
    passwordHash,
    userInfo.openId ?? null,
    userInfo.unionId ?? null,
    userInfo.nick ?? null
  );

  return getAccountById(result.lastInsertRowid as number)!;
}


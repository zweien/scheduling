import crypto from 'crypto';
import db from './db';
import { hashPassword, verifyPassword } from './password';
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

export function createDingtalkAccount(userInfo: { openId: string; unionId: string; nick: string }): Account {
  const openIdPrefix = userInfo.openId.substring(0, 8);
  const username = `dingtalk_${openIdPrefix}`;
  const displayName = userInfo.nick || `钉钉用户_${openIdPrefix.substring(0, 4)}`;
  const passwordHash = hashPassword(crypto.randomBytes(32).toString('hex'));

  const result = db.prepare(`
    INSERT INTO accounts (username, display_name, password_hash, role, is_active, dingtalk_open_id, dingtalk_union_id, dingtalk_nick, auth_provider)
    VALUES (?, ?, ?, 'user', 1, ?, ?, ?, 'dingtalk')
  `).run(username, displayName, passwordHash, userInfo.openId, userInfo.unionId, userInfo.nick);

  return getAccountById(result.lastInsertRowid as number)!;
}


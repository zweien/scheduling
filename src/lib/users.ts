// src/lib/users.ts
import db from './db';
import type { DutyUserImportRow, User, UserCategory, UserOrganization } from '@/types';

export interface UserFilters {
  search?: string;
  organization?: UserOrganization | '';
  category?: UserCategory | '';
  status?: 'active' | 'inactive' | '';
}

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY sort_order').all() as User[];
}

export function getActiveUsers(): User[] {
  return db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY sort_order').all() as User[];
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByName(name: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE name = ?').get(name.trim()) as User | undefined;
}

export function createUser(name: string, details?: {
  organization?: UserOrganization;
  category?: UserCategory;
  notes?: string;
}): User {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM users').get() as { max: number | null };
  const sortOrder = (maxOrder?.max ?? 0) + 1;
  const result = db.prepare(`
    INSERT INTO users (name, organization, category, notes, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    name,
    details?.organization ?? 'W',
    details?.category ?? 'W',
    details?.notes?.trim() ?? '',
    sortOrder
  );
  return getUserById(result.lastInsertRowid as number)!;
}

export function deleteUser(id: number): void {
  const transaction = db.transaction(() => {
    // 先删除该用户的所有排班记录
    db.prepare('DELETE FROM schedules WHERE user_id = ?').run(id);
    // 再删除用户
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  });
  transaction();
}

export function reorderUsers(userIds: number[]): void {
  const update = db.prepare('UPDATE users SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    userIds.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  transaction();
}

export function setUserActive(id: number, isActive: boolean): void {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

export function updateUserProfile(id: number, input: {
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  notes: string;
}) {
  db.prepare(`
    UPDATE users
    SET name = ?, organization = ?, category = ?, notes = ?
    WHERE id = ?
  `).run(input.name, input.organization, input.category, input.notes.trim(), id);

  return getUserById(id);
}

export function createOrUpdateUserByName(input: DutyUserImportRow) {
  const existing = getUserByName(input.name);
  if (existing) {
    db.prepare(`
      UPDATE users
      SET organization = ?, category = ?, notes = ?, is_active = ?
      WHERE id = ?
    `).run(
      input.organization,
      input.category,
      input.notes.trim(),
      input.isActive ? 1 : 0,
      existing.id
    );

    return { type: 'updated' as const, user: getUserById(existing.id)! };
  }

  const created = createUser(input.name, {
    organization: input.organization,
    category: input.category,
    notes: input.notes,
  });
  setUserActive(created.id, input.isActive);

  return { type: 'created' as const, user: getUserById(created.id)! };
}

export function getUsersByFilters(filters: UserFilters = {}) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.search?.trim()) {
    conditions.push("(name LIKE ? OR COALESCE(notes, '') LIKE ?)");
    const search = `%${filters.search.trim()}%`;
    params.push(search, search);
  }

  if (filters.organization?.trim()) {
    conditions.push('organization = ?');
    params.push(filters.organization.trim());
  }

  if (filters.category?.trim()) {
    conditions.push('category = ?');
    params.push(filters.category.trim());
  }

  if (filters.status === 'active') {
    conditions.push('is_active = 1');
  } else if (filters.status === 'inactive') {
    conditions.push('is_active = 0');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM users ${whereClause} ORDER BY sort_order, id`).all(...params) as User[];
}

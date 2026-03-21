// src/lib/config-options.ts
import db from './db';
import type { ConfigOption, ConfigOptionType } from '@/types';

/**
 * 根据 ID 查询配置选项（内部函数）
 */
function getConfigOptionById(id: number): ConfigOption | undefined {
  return db.prepare('SELECT * FROM config_options WHERE id = ?').get(id) as ConfigOption | undefined;
}

/**
 * 查询配置选项（按类型筛选或获取全部）
 */
export function getConfigOptions(type?: ConfigOptionType): ConfigOption[] {
  if (type) {
    return db
      .prepare('SELECT * FROM config_options WHERE type = ? ORDER BY sort_order')
      .all(type) as ConfigOption[];
  }
  return db.prepare('SELECT * FROM config_options ORDER BY type, sort_order').all() as ConfigOption[];
}

/**
 * 根据 type 和 value 查询单个配置
 */
export function getConfigOptionByValue(type: ConfigOptionType, value: string): ConfigOption | undefined {
  return db
    .prepare('SELECT * FROM config_options WHERE type = ? AND value = ?')
    .get(type, value) as ConfigOption | undefined;
}

/**
 * 创建新配置选项
 * 自动计算 sort_order（当前最大值 + 1）
 */
export function createConfigOption(input: {
  type: ConfigOptionType;
  value: string;
  label: string;
}): ConfigOption {
  // 获取当前类型的最大 sort_order
  const maxOrder = db
    .prepare('SELECT MAX(sort_order) as max FROM config_options WHERE type = ?')
    .get(input.type) as { max: number | null };
  const sortOrder = (maxOrder?.max ?? 0) + 1;

  const result = db
    .prepare(`
      INSERT INTO config_options (type, value, label, sort_order)
      VALUES (?, ?, ?, ?)
    `)
    .run(input.type, input.value.trim(), input.label.trim(), sortOrder);

  return getConfigOptionById(result.lastInsertRowid as number)!;
}

/**
 * 更新配置选项
 */
export function updateConfigOption(
  id: number,
  input: { value?: string; label?: string }
): ConfigOption | undefined {
  const existing = getConfigOptionById(id);
  if (!existing) {
    return undefined;
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.value !== undefined) {
    updates.push('value = ?');
    params.push(input.value.trim());
  }

  if (input.label !== undefined) {
    updates.push('label = ?');
    params.push(input.label.trim());
  }

  if (updates.length === 0) {
    return existing;
  }

  params.push(id);
  db.prepare(`UPDATE config_options SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return getConfigOptionById(id);
}

/**
 * 删除配置选项
 * 有关联人员时阻止删除
 */
export function deleteConfigOption(id: number): { success: boolean; error?: string } {
  const option = getConfigOptionById(id);
  if (!option) {
    return { success: false, error: '配置选项不存在' };
  }

  // 检查 users 表是否有关联人员
  let hasRelatedUsers = false;
  if (option.type === 'organization') {
    const count = db
      .prepare('SELECT COUNT(*) as count FROM users WHERE organization = ?')
      .get(option.value) as { count: number };
    hasRelatedUsers = count.count > 0;
  } else if (option.type === 'category') {
    const count = db
      .prepare('SELECT COUNT(*) as count FROM users WHERE category = ?')
      .get(option.value) as { count: number };
    hasRelatedUsers = count.count > 0;
  }

  if (hasRelatedUsers) {
    return { success: false, error: '该配置选项下存在关联人员，无法删除' };
  }

  db.prepare('DELETE FROM config_options WHERE id = ?').run(id);
  return { success: true };
}

/**
 * 重排序配置选项
 * 使用事务批量更新 sort_order
 */
export function reorderConfigOptions(type: ConfigOptionType, ids: number[]): void {
  const update = db.prepare('UPDATE config_options SET sort_order = ? WHERE id = ? AND type = ?');
  const transaction = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id, type);
    });
  });
  transaction();
}

/**
 * 校验值是否有效
 */
export function isValidConfigValue(type: ConfigOptionType, value: string): boolean {
  const option = getConfigOptionByValue(type, value);
  return option !== undefined;
}

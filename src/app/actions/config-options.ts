'use server';

import {
  getConfigOptions,
  createConfigOption,
  updateConfigOption,
  deleteConfigOption,
  reorderConfigOptions,
} from '@/lib/config-options';
import type { ConfigOptionType } from '@/types';

export async function getOrganizationOptions() {
  return getConfigOptions('organization');
}

export async function getCategoryOptions() {
  return getConfigOptions('category');
}

export async function saveConfigOption(
  id: number | null,
  type: ConfigOptionType,
  value: string,
  label: string
) {
  if (id === null) {
    return createConfigOption({ type, value, label });
  }
  const result = updateConfigOption(id, { value, label });
  // 更新时如果找不到记录，返回新创建的作为后备
  return result ?? createConfigOption({ type, value, label });
}

export async function deleteConfigOptionAction(id: number) {
  return deleteConfigOption(id);
}

export async function reorderConfigOptionsAction(
  type: ConfigOptionType,
  ids: number[]
) {
  reorderConfigOptions(type, ids);
}

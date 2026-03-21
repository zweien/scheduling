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
  return updateConfigOption(id, { value, label });
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

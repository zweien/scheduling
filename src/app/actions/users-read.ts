'use server';

import { getActiveUsers, getAllUsers, getUsersByFilters } from '@/lib/users';
import { getConfigOptions } from '@/lib/config-options';
import { requireAdmin, requireAuth } from '@/lib/auth';
import type { UserCategory, UserOrganization } from '@/types';

type DutyUserFiltersInput = {
  search?: string;
  organization?: UserOrganization | '';
  category?: UserCategory | '';
  status?: 'active' | 'inactive' | '';
};

export interface ConfigOptionSimple {
  value: string;
  label: string;
}

export async function getUsers() {
  return getAllUsers();
}

export async function getAssignableUsers() {
  return getActiveUsers();
}

export async function getDutyUsers(filters?: DutyUserFiltersInput) {
  await requireAdmin();
  return getUsersByFilters(filters);
}

export async function getDutyUsersForView(filters?: DutyUserFiltersInput) {
  await requireAuth();
  return getUsersByFilters(filters);
}

/**
 * 获取值班人员配置选项（所属单位、人员类别）
 */
export async function getDutyUserConfigOptions(): Promise<{
  organizationOptions: ConfigOptionSimple[];
  categoryOptions: ConfigOptionSimple[];
}> {
  await requireAuth();

  const organizationOptions = getConfigOptions('organization').map(opt => ({
    value: opt.value,
    label: opt.label,
  }));

  const categoryOptions = getConfigOptions('category').map(opt => ({
    value: opt.value,
    label: opt.label,
  }));

  return { organizationOptions, categoryOptions };
}

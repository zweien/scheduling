'use server';

import { getActiveUsers, getAllUsers, getUsersByFilters } from '@/lib/users';
import { requireAdmin, requireAuth } from '@/lib/auth';
import type { UserCategory, UserOrganization } from '@/types';

type DutyUserFiltersInput = {
  search?: string;
  organization?: UserOrganization | '';
  category?: UserCategory | '';
  status?: 'active' | 'inactive' | '';
};

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

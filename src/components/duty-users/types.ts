import type { UserCategory, UserOrganization } from '@/types';

export type DutyUserFiltersState = {
  search: string;
  organization: UserOrganization | '';
  category: UserCategory | '';
  status: 'active' | 'inactive' | '';
};

export type DutyUserFormState = {
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  notes: string;
};

// src/types/index.ts

export interface User {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Schedule {
  id: number;
  date: string;
  user_id: number;
  is_manual: boolean;
  created_at: string;
}

export interface ScheduleWithUser extends Schedule {
  user: User;
}

export interface Log {
  id: number;
  action: string;
  target: string;
  old_value: string | null;
  new_value: string | null;
  operator_username: string | null;
  operator_role: AccountRole | null;
  ip_address: string | null;
  source: LogSource | null;
  created_at: string;
}

export interface Config {
  key: string;
  value: string;
}

export interface ApiToken {
  id: number;
  name: string;
  token_hash: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  disabled_at: string | null;
}

export type AccountRole = 'admin' | 'user';
export type LogSource = 'web' | 'api' | 'system';

export interface Account {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  role: AccountRole;
  is_active: boolean;
  created_at: string;
}

export type Action =
  | 'login'
  | 'logout'
  | 'register'
  | 'add_user'
  | 'delete_user'
  | 'reorder_users'
  | 'toggle_user_active'
  | 'generate_schedule'
  | 'replace_schedule'
  | 'delete_schedule'
  | 'swap_schedule'
  | 'set_password'
  | 'add_account'
  | 'toggle_account_active'
  | 'change_account_role'
  | 'toggle_registration'
  | 'create_token'
  | 'disable_token';

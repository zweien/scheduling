// src/types/index.ts

export interface User {
  id: number;
  name: string;
  sort_order: number;
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
  created_at: string;
}

export interface Config {
  key: string;
  value: string;
}

export type Action =
  | 'login'
  | 'logout'
  | 'add_user'
  | 'delete_user'
  | 'reorder_users'
  | 'generate_schedule'
  | 'replace_schedule'
  | 'swap_schedule'
  | 'set_password';

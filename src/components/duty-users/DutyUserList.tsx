'use client';

import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface DutyUserListProps {
  users: User[];
  canManage: boolean;
  onEdit: (user: User) => void;
  onToggleActive: (user: User) => void;
  onDelete: (user: User) => void;
}

export function DutyUserList({ users, canManage, onEdit, onToggleActive, onDelete }: DutyUserListProps) {
  return (
    <section className="space-y-3">
      {users.map(user => (
        <div key={user.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{user.name}</div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{user.organization}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{user.category}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {user.is_active ? '参与值班' : '已停用'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">{user.notes || '无备注'}</div>
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(user)}>编辑</Button>
                <Button variant="outline" size="sm" onClick={() => onToggleActive(user)}>
                  {user.is_active ? '停用' : '启用'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(user)}>删除</Button>
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          当前筛选条件下没有值班人员
        </div>
      ) : null}
    </section>
  );
}

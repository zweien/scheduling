'use client';

import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface DutyUserListProps {
  users: User[];
  canManage: boolean;
  selectedUserIds: Set<number>;
  allVisibleSelected: boolean;
  onEdit: (user: User) => void;
  onToggleSelect: (userId: number) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  onToggleActive: (user: User) => void;
  onDelete: (user: User) => void;
}

export function DutyUserList({
  users,
  canManage,
  selectedUserIds,
  allVisibleSelected,
  onEdit,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteSelected,
  onToggleActive,
  onDelete,
}: DutyUserListProps) {
  const selectedCount = selectedUserIds.size;

  return (
    <section className="space-y-3">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            已选中 {selectedCount} 人
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onToggleSelectAll} disabled={users.length === 0}>
              {allVisibleSelected ? '取消全选' : '全选当前列表'}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDeleteSelected} disabled={selectedCount === 0}>
              {selectedCount > 0 ? `删除选中人员 (${selectedCount})` : '删除选中人员'}
            </Button>
          </div>
        </div>
      ) : null}

      {users.map(user => (
        <div key={user.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              {canManage ? (
                <label className="mt-1 flex items-start">
                  <input
                    type="checkbox"
                    aria-label={`选择值班人员 ${user.name}`}
                    className="h-4 w-4 rounded border-border text-destructive focus:ring-destructive"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => onToggleSelect(user.id)}
                  />
                </label>
              ) : null}

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

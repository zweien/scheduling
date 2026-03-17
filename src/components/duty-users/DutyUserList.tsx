'use client';

import { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';
import { reorderUserIds } from './reorder-helpers';

function DraggableDutyUserItem({
  user,
  canManage,
  selectedUserIds,
  draggingUserId,
  onDragStart,
  onDragEnd,
  onDropOnUser,
  onEdit,
  onToggleSelect,
  onToggleActive,
  onDelete,
}: {
  user: User;
  canManage: boolean;
  selectedUserIds: Set<number>;
  draggingUserId: number | null;
  onDragStart: (userId: number) => void;
  onDragEnd: () => void;
  onDropOnUser: (targetUserId: number, activeUserId: number | null) => void;
  onEdit: (user: User) => void;
  onToggleSelect: (userId: number) => void;
  onToggleActive: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 ${draggingUserId === user.id ? 'opacity-70' : ''}`}
      data-testid={`duty-user-card-${user.id}`}
      draggable
      onDragStart={event => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(user.id));
        onDragStart(user.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={event => {
        event.preventDefault();
      }}
      onDrop={event => {
        event.preventDefault();
        const activeUserId = Number(event.dataTransfer.getData('text/plain'));
        onDropOnUser(user.id, Number.isNaN(activeUserId) ? null : activeUserId);
      }}
    >
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

          <button
            type="button"
            aria-label={`拖拽排序 ${user.name}`}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition hover:bg-muted"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div data-testid="duty-user-card-name" className="font-medium">{user.name}</div>
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
  );
}

interface DutyUserListProps {
  users: User[];
  canManage: boolean;
  canReorder: boolean;
  reorderHint: string | null;
  selectedUserIds: Set<number>;
  allVisibleSelected: boolean;
  onEdit: (user: User) => void;
  onReorder: (userIds: number[]) => void;
  onToggleSelect: (userId: number) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  onToggleActive: (user: User) => void;
  onDelete: (user: User) => void;
}

export function DutyUserList({
  users,
  canManage,
  canReorder,
  reorderHint,
  selectedUserIds,
  allVisibleSelected,
  onEdit,
  onReorder,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteSelected,
  onToggleActive,
  onDelete,
}: DutyUserListProps) {
  const selectedCount = selectedUserIds.size;
  const [draggingUserId, setDraggingUserId] = useState<number | null>(null);
  const draggingUserIdRef = useRef<number | null>(null);

  function renderUserCard(user: User) {
    return (
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
                <div data-testid="duty-user-card-name" className="font-medium">{user.name}</div>
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
    );
  }

  function handleDropOnUser(targetUserId: number, activeUserId: number | null) {
    const sourceUserId = activeUserId ?? draggingUserIdRef.current;

    if (sourceUserId === null || sourceUserId === targetUserId) {
      draggingUserIdRef.current = null;
      setDraggingUserId(null);
      return;
    }

    onReorder(reorderUserIds(users.map(user => user.id), sourceUserId, targetUserId));
    draggingUserIdRef.current = null;
    setDraggingUserId(null);
  }

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

      {reorderHint ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {reorderHint}
        </div>
      ) : null}

      {canReorder ? (
        <div className="space-y-3">
          {users.map(user => (
            <DraggableDutyUserItem
              key={user.id}
              user={user}
              canManage={canManage}
              selectedUserIds={selectedUserIds}
              draggingUserId={draggingUserId}
              onDragStart={userId => {
                draggingUserIdRef.current = userId;
                setDraggingUserId(userId);
              }}
              onDragEnd={() => {
                draggingUserIdRef.current = null;
                setDraggingUserId(null);
              }}
              onDropOnUser={handleDropOnUser}
              onEdit={onEdit}
              onToggleSelect={onToggleSelect}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        users.map(user => renderUserCard(user))
      )}

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          当前筛选条件下没有值班人员
        </div>
      ) : null}
    </section>
  );
}

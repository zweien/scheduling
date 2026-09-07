'use client';

import { useEffect, useRef } from 'react';

export type CalendarContextMenuAction =
  | 'auto_schedule'
  | 'assign_user'
  | 'replace_user'
  | 'move_schedule'
  | 'delete_schedule'
  | 'assign_leader'
  | 'replace_leader'
  | 'delete_leader_schedule'
  | 'edit_note';

type ContextMenuViewMode = 'duty' | 'leader' | 'all';

interface CalendarContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  hasSchedule: boolean;
  hasLeaderSchedule: boolean;
  viewMode: ContextMenuViewMode;
  labelledBy?: string;
  onSelect: (action: CalendarContextMenuAction) => void;
  onClose: () => void;
}

const emptyDateActions: Array<{ key: CalendarContextMenuAction; label: string }> = [
  { key: 'auto_schedule', label: '自动排班' },
  { key: 'assign_user', label: '安排值班人员' },
  { key: 'edit_note', label: '添加/编辑备注' },
];

const scheduledDateActions: Array<{ key: CalendarContextMenuAction; label: string }> = [
  { key: 'replace_user', label: '替换值班人员' },
  { key: 'move_schedule', label: '移动到其他日期' },
  { key: 'delete_schedule', label: '删除排班' },
  { key: 'edit_note', label: '添加/编辑备注' },
];

const leaderEmptyDateActions: Array<{ key: CalendarContextMenuAction; label: string }> = [
  { key: 'assign_leader', label: '安排值班领导' },
  { key: 'edit_note', label: '添加/编辑备注' },
];

const leaderScheduledDateActions: Array<{ key: CalendarContextMenuAction; label: string }> = [
  { key: 'replace_leader', label: '替换值班领导' },
  { key: 'delete_leader_schedule', label: '删除值班领导' },
  { key: 'edit_note', label: '添加/编辑备注' },
];

function getMenuActions(
  viewMode: ContextMenuViewMode,
  hasSchedule: boolean,
  hasLeaderSchedule: boolean
): Array<{ key: CalendarContextMenuAction; label: string }> {
  if (viewMode === 'leader') {
    return hasLeaderSchedule ? leaderScheduledDateActions : leaderEmptyDateActions;
  }

  if (viewMode === 'duty') {
    return hasSchedule ? scheduledDateActions : emptyDateActions;
  }

  // 全部视图：值班员操作 + 值班领导操作
  const actions = hasSchedule
    ? scheduledDateActions.filter(action => action.key !== 'edit_note')
    : emptyDateActions.filter(action => action.key !== 'edit_note');
  actions.push(
    hasLeaderSchedule
      ? { key: 'replace_leader', label: '替换值班领导' }
      : { key: 'assign_leader', label: '安排值班领导' }
  );
  if (hasLeaderSchedule) {
    actions.push({ key: 'delete_leader_schedule', label: '删除值班领导' });
  }
  actions.push({ key: 'edit_note', label: '添加/编辑备注' });
  return actions;
}

export function CalendarContextMenu({
  open,
  x,
  y,
  hasSchedule,
  hasLeaderSchedule,
  viewMode,
  labelledBy,
  onSelect,
  onClose,
}: CalendarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstMenuItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstMenuItem?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const actions = getMenuActions(viewMode, hasSchedule, hasLeaderSchedule);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-labelledby={labelledBy}
      className="fixed z-50 min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {actions.map(action => (
        <button
          key={action.key}
          type="button"
          role="menuitem"
          className="flex w-full rounded px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted"
          onClick={() => onSelect(action.key)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

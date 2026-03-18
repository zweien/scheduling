'use client';

import { useEffect, useRef } from 'react';

export type CalendarContextMenuAction =
  | 'auto_schedule'
  | 'assign_user'
  | 'replace_user'
  | 'move_schedule'
  | 'delete_schedule';

interface CalendarContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  hasSchedule: boolean;
  labelledBy?: string;
  onSelect: (action: CalendarContextMenuAction) => void;
  onClose: () => void;
}

const emptyDateActions: Array<{ key: CalendarContextMenuAction; label: string }> = [
  { key: 'auto_schedule', label: '自动排班' },
  { key: 'assign_user', label: '安排值班人员' },
];

const scheduledDateActions: Array<{ key: CalendarContextMenuAction; label: string }> = [
  { key: 'replace_user', label: '替换值班人员' },
  { key: 'move_schedule', label: '移动到其他日期' },
  { key: 'delete_schedule', label: '删除排班' },
];

export function CalendarContextMenu({
  open,
  x,
  y,
  hasSchedule,
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

  const actions = hasSchedule ? scheduledDateActions : emptyDateActions;

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

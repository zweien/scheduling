// src/components/CalendarCell.tsx
'use client';

import type { ScheduleWithUser } from '@/types';
import { getAvatarColor, getAvatarInitial } from '@/lib/avatar';
import { Plus } from 'lucide-react';

interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  isToday: boolean;
  onClick: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragSource?: boolean;
  isDropTarget?: boolean;
  animationDelay?: number;
  displayMode?: 'avatar' | 'name';
  canManage?: boolean;
}

export function CalendarCell({
  date,
  schedule,
  isToday,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDragSource = false,
  isDropTarget = false,
  animationDelay = 0,
  displayMode = 'avatar',
  canManage = true,
}: CalendarCellProps) {
  const day = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      onClick={onClick}
      draggable={canManage && !!schedule}
      onDragStart={canManage ? onDragStart : undefined}
      onDragOver={canManage ? onDragOver : undefined}
      onDrop={canManage ? onDrop : undefined}
      className={`
        relative min-h-[50px] sm:min-h-[80px] p-1 sm:p-2 border rounded ${canManage ? 'cursor-pointer' : 'cursor-default'}
        transition-all duration-150
        ${schedule ? 'group' : ''}
        ${isToday
          ? 'border-l-4 border-l-primary bg-primary/5 animate-pulse-glow'
          : 'border-border'}
        ${isWeekend ? 'bg-muted/30' : 'bg-background'}
        ${schedule && canManage ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}
        ${isDragSource ? 'opacity-40' : ''}
        ${isDropTarget ? 'border-2 border-dashed border-primary bg-primary/10' : ''}
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* 日期 */}
      <div className={`absolute top-1 right-1 text-xs font-medium
        ${isWeekend ? 'text-muted-foreground' : 'text-foreground'}
        ${isToday ? 'text-primary' : ''}`}>
        {day}
      </div>

      {/* 手动调整标记 */}
      {schedule?.is_manual && (
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-500" />
      )}

      {/* 头像/姓名 */}
      {schedule && (
        <div className="flex items-center justify-center h-full pt-4">
          {displayMode === 'avatar' ? (
            <div
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-sm"
              style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
            >
              {getAvatarInitial(schedule.user.name)}
            </div>
          ) : (
            <div
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-medium text-white truncate max-w-full"
              style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
            >
              {schedule.user.name}
            </div>
          )}
        </div>
      )}

      {/* 悬停显示人员详情 tooltip */}
      {schedule && (
        <div
          data-testid="schedule-tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
            opacity-0 group-hover:opacity-100 pointer-events-none
            transition-opacity duration-150
            bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2 min-w-[120px]"
        >
          <div className="text-sm font-medium">{schedule.user.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {schedule.user.organization} · {schedule.user.category}
          </div>
        </div>
      )}

      {/* 空单元格 hover 提示 */}
      {!schedule && canManage && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// src/components/CalendarCell.tsx
'use client';

import type React from 'react';
import type { ScheduleWithUser } from '@/types';
import { getAvatarColor, getAvatarInitial } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  isToday: boolean;
  isSelected?: boolean;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  isSelected = false,
  onClick,
  onDragStart,
  onDragEnd,
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
  const showOriginalAndCurrent = Boolean(
    schedule?.original_user && schedule.original_user.id !== schedule.user.id
  );

  return (
    <div
      data-calendar-date={format(date, 'yyyy-MM-dd')}
      data-selected={isSelected ? 'true' : 'false'}
      onClick={onClick}
      draggable={canManage && !!schedule}
      onDragStart={canManage ? onDragStart : undefined}
      onDragEnd={canManage ? onDragEnd : undefined}
      onDragOver={canManage ? onDragOver : undefined}
      onDrop={canManage ? onDrop : undefined}
      className={cn(
        'relative rounded border p-1 transition-all duration-150 sm:min-h-[80px] sm:p-2',
        displayMode === 'name' ? 'min-h-[60px] sm:min-h-[96px]' : 'min-h-[50px]',
        canManage ? 'cursor-pointer' : 'cursor-default',
        schedule ? 'group' : '',
        isToday ? 'border-l-4 border-l-primary bg-primary/5 animate-pulse-glow' : 'border-border',
        isWeekend ? 'bg-muted/30' : 'bg-background',
        schedule && canManage ? 'hover:-translate-y-0.5 hover:shadow-md' : '',
        isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-sm' : '',
        isDragSource ? 'opacity-40' : '',
        isDropTarget ? 'border-2 border-dashed border-primary bg-primary/10' : ''
      )}
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
        <div className={cn('flex h-full items-center justify-center sm:pt-4', displayMode === 'name' ? 'pt-3' : 'pt-4')}>
          {showOriginalAndCurrent ? (
            displayMode === 'avatar' ? (
              <div
                data-adjusted-display="avatar"
                className="flex w-full flex-col items-center justify-center gap-1 px-1 sm:px-2"
              >
                <div className="flex items-center gap-1 rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground sm:px-1.5 sm:text-[10px]">
                  <span className="shrink-0 font-medium">原</span>
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium text-white sm:h-5 sm:w-5 sm:text-[10px]"
                    style={{ backgroundColor: getAvatarColor(schedule.original_user?.name ?? '') }}
                  >
                    {getAvatarInitial(schedule.original_user?.name ?? '')}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] text-white sm:px-1.5 sm:text-[10px]" style={{ backgroundColor: getAvatarColor(schedule.user.name) }}>
                  <span className="shrink-0 font-medium">现</span>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[9px] font-medium text-white sm:h-5 sm:w-5 sm:text-[10px]">
                    {getAvatarInitial(schedule.user.name)}
                  </div>
                </div>
              </div>
            ) : (
              <div
                data-adjusted-display="name"
                className="w-full space-y-0.5 px-0.5 text-[9px] leading-tight sm:space-y-1 sm:px-2 sm:text-xs"
              >
                <div className="rounded bg-muted px-1 py-0.5 text-muted-foreground sm:px-1.5 sm:py-1">
                  <span className="sm:hidden">原 </span>
                  <span className="break-all whitespace-normal">
                    <span className="hidden sm:inline">原：</span>
                    {schedule.original_user?.name}
                  </span>
                </div>
                <div
                  className="rounded px-1 py-0.5 text-white sm:px-1.5 sm:py-1"
                  style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
                >
                  <span className="sm:hidden">现 </span>
                  <span className="break-all whitespace-normal">
                    <span className="hidden sm:inline">现：</span>
                    {schedule.user.name}
                  </span>
                </div>
              </div>
            )
          ) : displayMode === 'avatar' ? (
            <div
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-sm"
              style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
            >
              {getAvatarInitial(schedule.user.name)}
            </div>
          ) : (
            <div
              className="max-w-full rounded px-1 py-0.5 text-center text-[10px] font-medium leading-tight text-white break-all whitespace-normal sm:px-2 sm:py-1 sm:text-sm"
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

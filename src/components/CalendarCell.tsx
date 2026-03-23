// src/components/CalendarCell.tsx
'use client';

import type React from 'react';
import { memo } from 'react';
import type { ScheduleWithUser, LeaderScheduleWithLeader } from '@/types';
import { getAvatarColor, getAvatarInitial } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  leaderSchedule?: LeaderScheduleWithLeader;
  viewMode?: 'duty' | 'leader' | 'all';
  isToday: boolean;
  isSelected?: boolean;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragSource?: boolean;
  isDropTarget?: boolean;
  animationDelay?: number;
  displayMode?: 'avatar' | 'name';
  canManage?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  /** 拖拽预览：被拖拽的用户信息 */
  dragPreviewUser?: { id: number; name: string };
}

const CalendarCellInner = memo(function CalendarCellInner({
  date,
  schedule,
  leaderSchedule,
  viewMode = 'duty',
  isToday,
  isSelected = false,
  onClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragSource = false,
  isDropTarget = false,
  animationDelay = 0,
  displayMode = 'avatar',
  canManage = true,
  isHoliday = false,
  holidayName,
  dragPreviewUser,
}: CalendarCellProps) {
  const day = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const showOriginalAndCurrent = Boolean(
    schedule?.original_user && schedule.original_user.id !== schedule.user.id
  );

  // 根据 viewMode 决定显示内容
  const showDuty = viewMode === 'duty' || viewMode === 'all';
  const showLeader = viewMode === 'leader' || viewMode === 'all';

  // 在 leader 模式下，显示值班领导作为主要内容
  const primarySchedule = viewMode === 'leader' ? leaderSchedule?.leader : schedule?.user;
  const primaryName = primarySchedule?.name;

  return (
    <div
      data-calendar-date={format(date, 'yyyy-MM-dd')}
      data-selected={isSelected ? 'true' : 'false'}
      tabIndex={-1}
      onClick={onClick}
      onContextMenu={canManage ? onContextMenu : undefined}
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
        isWeekend ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-background',
        isHoliday ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : '',
        schedule && canManage ? 'hover:-translate-y-0.5 hover:shadow-md' : '',
        isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-sm' : '',
        isDragSource ? 'opacity-40' : '',
        isDropTarget ? 'border-2 border-dashed border-primary bg-primary/10' : ''
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* 日期 */}
      <div className={`absolute top-1 right-1 text-xs font-medium tabular-nums
        ${isWeekend ? 'text-muted-foreground' : 'text-foreground'}
        ${isToday ? 'text-primary' : ''}`}>
        {day}
      </div>

      {/* 手动调整标记 */}
      {schedule?.is_manual && (
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-500" />
      )}

      {/* 节假日标记 */}
      {isHoliday && holidayName && (
        <div className="absolute bottom-1 left-1 right-1 text-[8px] text-blue-700 dark:text-blue-300 text-center truncate">
          {holidayName}
        </div>
      )}

      {/* 拖拽预览效果 */}
      {isDropTarget && dragPreviewUser && !schedule && (
        <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
          {displayMode === 'avatar' ? (
            <div
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium border-2 border-dashed border-primary animate-pulse"
              style={{ backgroundColor: getAvatarColor(dragPreviewUser.name) }}
            >
              {getAvatarInitial(dragPreviewUser.name)}
            </div>
          ) : (
            <div
              className="max-w-full rounded px-1 py-0.5 text-center text-[10px] font-medium leading-tight text-white break-all whitespace-normal sm:px-2 sm:py-1 sm:text-sm border-2 border-dashed border-primary animate-pulse"
              style={{ backgroundColor: getAvatarColor(dragPreviewUser.name) }}
            >
              {dragPreviewUser.name}
            </div>
          )}
        </div>
      )}

      {/* 头像/姓名 */}
      {(() => {
        // 领导模式：只显示值班领导
        if (viewMode === 'leader' && leaderSchedule) {
          return (
            <div className="flex h-full items-center justify-center pt-4">
              {displayMode === 'avatar' ? (
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-sm transition-all duration-200"
                  style={{ backgroundColor: getAvatarColor(leaderSchedule.leader.name) }}
                >
                  {getAvatarInitial(leaderSchedule.leader.name)}
                </div>
              ) : (
                <div
                  className="max-w-full rounded px-1 py-0.5 text-center text-[10px] font-medium leading-tight text-white break-all whitespace-normal sm:px-2 sm:py-1 sm:text-sm transition-all duration-200"
                  style={{ backgroundColor: getAvatarColor(leaderSchedule.leader.name) }}
                >
                  {leaderSchedule.leader.name}
                </div>
              )}
            </div>
          );
        }

        // 全部模式：上方显示值班员，下方显示值班领导
        if (viewMode === 'all') {
          const hasDuty = !!schedule;
          const hasLeader = !!leaderSchedule;

          if (!hasDuty && !hasLeader) {
            return null;
          }

          return (
            <div className="flex h-full flex-col items-center justify-center gap-0.5 pt-4">
              {/* 值班员 */}
              {hasDuty && (
                <div
                  className="max-w-full rounded px-1 py-0.5 text-center text-[10px] font-medium leading-tight text-white break-all whitespace-normal sm:px-2 sm:py-1 sm:text-sm"
                  style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
                >
                  {schedule.user.name}
                </div>
              )}
              {/* 值班领导（小字号） */}
              {hasLeader && (
                <div className="text-[8px] sm:text-[10px] text-muted-foreground font-medium">
                  {leaderSchedule.leader.name}
                </div>
              )}
            </div>
          );
        }

        // 值班员模式：只显示值班员（默认行为）
        if (schedule) {
          return (
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
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-sm transition-all duration-200"
                  style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
                >
                  {getAvatarInitial(schedule.user.name)}
                </div>
              ) : (
                <div
                  className="max-w-full rounded px-1 py-0.5 text-center text-[10px] font-medium leading-tight text-white break-all whitespace-normal sm:px-2 sm:py-1 sm:text-sm transition-all duration-200"
                  style={{ backgroundColor: getAvatarColor(schedule.user.name) }}
                >
                  {schedule.user.name}
                </div>
              )}
            </div>
          );
        }

        return null;
      })()}

      {/* 悬停显示人员详情 tooltip */}
      {schedule && viewMode !== 'leader' && (
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

      {/* 值班领导悬停提示 */}
      {leaderSchedule && viewMode === 'leader' && (
        <div
          data-testid="leader-tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
            opacity-0 group-hover:opacity-100 pointer-events-none
            transition-opacity duration-150
            bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2 min-w-[120px]"
        >
          <div className="text-sm font-medium">{leaderSchedule.leader.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">值班领导</div>
        </div>
      )}

      {/* 空单元格 hover 提示 */}
      {!schedule && !leaderSchedule && canManage && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
});

// 导出 memo 化的组件
export const CalendarCell = CalendarCellInner;

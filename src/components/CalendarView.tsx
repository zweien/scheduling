// src/components/CalendarView.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarCell } from './CalendarCell';
import { ScheduleAdjustmentReasonDialog } from './ScheduleAdjustmentReasonDialog';
import { UserSelectDialog } from './UserSelectDialog';
import { batchDeleteSchedules, getSchedules, moveSchedule, moveScheduleDirect, removeSchedule, replaceSchedule, swapSchedules, swapSchedulesDirect } from '@/app/actions/schedule';
import { getAssignableUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User as UserIcon, UserCircle } from 'lucide-react';

interface CalendarViewProps {
  refreshKey: number;
  canManage: boolean;
}

type DisplayMode = 'avatar' | 'name';

type PendingDragAction =
  | {
      type: 'move';
      sourceDate: string;
      targetDate: string;
      sourceUserName: string;
      targetUserName: null;
    }
  | {
      type: 'swap';
      sourceDate: string;
      targetDate: string;
      sourceUserName: string;
      targetUserName: string;
    };

interface MonthCalendarProps {
  month: Date;
  schedules: ScheduleWithUser[];
  users: User[];
  today: Date;
  displayMode: DisplayMode;
  dragDate: string | null;
  selectedDates: Set<string>;
  onCellClick: (date: Date, event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (date: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (date: string) => void;
  canManage: boolean;
}

function MonthCalendar({
  month,
  schedules,
  today,
  displayMode,
  dragDate,
  selectedDates,
  onCellClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  canManage,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-2">
      <h3 className="text-base font-medium text-center">
        {format(month, 'yyyy年M月', { locale: zhCN })}
      </h3>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const schedule = schedules.find(s => s.date === dateStr);
          const isCurrentMonth = isSameMonth(day, month);
          const animationDelay = Math.min(index * 5, 150);

          if (!isCurrentMonth) {
            return (
              <div key={dateStr} className="min-h-[40px] sm:min-h-[60px] p-1 border rounded border-border bg-muted/20 opacity-40">
                <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
              </div>
            );
          }

          return (
            <CalendarCell
              key={dateStr}
              date={day}
              schedule={schedule}
              isToday={isSameDay(day, today)}
              isSelected={selectedDates.has(dateStr)}
              onClick={event => onCellClick(day, event)}
              onDragStart={() => onDragStart(dateStr)}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={() => onDrop(dateStr)}
              isDragSource={dragDate === dateStr}
              isDropTarget={dragDate !== null && dragDate !== dateStr}
              animationDelay={animationDelay}
              displayMode={displayMode}
              canManage={canManage}
            />
          );
        })}
      </div>
    </div>
  );
}

export function CalendarView({ refreshKey, canManage }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedHasSchedule, setSelectedHasSchedule] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [moveSourceDate, setMoveSourceDate] = useState<string | null>(null);
  const [pendingDragAction, setPendingDragAction] = useState<PendingDragAction | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('avatar');
  const [isMobileSingleMonthLayout, setIsMobileSingleMonthLayout] = useState(false);
  const hasCustomizedDisplayModeRef = useRef(false);

  const today = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  const loadData = useCallback(async () => {
    // 加载本月和下月的数据
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
    const [scheduleData, userData] = await Promise.all([
      getSchedules(start, end),
      getAssignableUsers(),
    ]);
    setSchedules(scheduleData);
    setSelectedDates(current => {
      const availableDates = new Set(scheduleData.map(schedule => schedule.date));
      return new Set([...current].filter(date => availableDates.has(date)));
    });
    setUsers(userData);
  }, [currentMonth]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData, refreshKey]);

  useEffect(() => {
    if (hasCustomizedDisplayModeRef.current || typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(min-width: 640px)').matches) {
      const frameId = window.requestAnimationFrame(() => {
        setDisplayMode('name');
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const syncLayout = (matches: boolean) => {
      setIsMobileSingleMonthLayout(matches);
    };

    syncLayout(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncLayout(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // 筛选本月和下月的排班
  const currentMonthSchedules = schedules.filter(s => {
    const date = new Date(s.date);
    return isSameMonth(date, currentMonth);
  });

  const nextMonthSchedules = schedules.filter(s => {
    const date = new Date(s.date);
    return isSameMonth(date, nextMonth);
  });

  const handleCellClick = (date: Date, event: React.MouseEvent<HTMLDivElement>) => {
    if (!canManage) {
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasSchedule = schedules.some(schedule => schedule.date === dateStr);
    const isMultiSelect = event.metaKey || event.ctrlKey;

    if (moveSourceDate) {
      if (moveSourceDate === dateStr) {
        setMoveSourceDate(null);
        return;
      }

      void (async () => {
        const targetHasSchedule = schedules.some(schedule => schedule.date === dateStr);
        if (targetHasSchedule) {
          await swapSchedulesDirect(moveSourceDate, dateStr);
        } else {
          await moveScheduleDirect(moveSourceDate, dateStr);
        }

        setMoveSourceDate(null);
        await loadData();
      })();
      return;
    }

    if (isMultiSelect) {
      if (!hasSchedule) {
        return;
      }

      setDialogOpen(false);
      setSelectedDate(null);
      setSelectedHasSchedule(false);
      setSelectedDates(current => {
        const next = new Set(current);
        if (next.has(dateStr)) {
          next.delete(dateStr);
        } else {
          next.add(dateStr);
        }
        return next;
      });
      return;
    }

    setSelectedDates(new Set());
    setSelectedHasSchedule(hasSchedule);
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const handleReplace = async (userId: number) => {
    if (!canManage) {
      return;
    }
    if (!selectedDate) return;
    await replaceSchedule(selectedDate, userId);
    setDialogOpen(false);
    setSelectedHasSchedule(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!canManage || !selectedDate) {
      return;
    }

    await removeSchedule(selectedDate);
    setDialogOpen(false);
    setSelectedHasSchedule(false);
    await loadData();
  };

  const handleSelectCurrentMonth = () => {
    if (!canManage) {
      return;
    }

    setSelectedDates(new Set(currentMonthSchedules.map(schedule => schedule.date)));
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedHasSchedule(false);
  };

  const handleClearSelection = () => {
    setSelectedDates(new Set());
  };

  const handleBatchDelete = async () => {
    if (!canManage || selectedDates.size === 0) {
      return;
    }

    const targetDates = [...selectedDates].sort();
    const confirmed = window.confirm(`确认删除已选择的 ${targetDates.length} 条排班吗？此操作不可撤销。`);
    if (!confirmed) {
      return;
    }

    const result = await batchDeleteSchedules(targetDates);
    if (!result.success) {
      return;
    }

    setSelectedDates(new Set());
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedHasSchedule(false);
    await loadData();
  };

  const handleMoveStart = () => {
    if (!canManage || !selectedDate || !selectedHasSchedule) {
      return;
    }

    setMoveSourceDate(selectedDate);
    setDialogOpen(false);
  };

  const handleDragStart = (date: string) => {
    if (!canManage) {
      return;
    }
    setDragDate(date);
  };

  const handleDragEnd = () => {
    setDragDate(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetDate: string) => {
    if (!canManage) {
      return;
    }
    if (!dragDate || dragDate === targetDate) {
      return;
    }

    const sourceSchedule = schedules.find(schedule => schedule.date === dragDate);
    const targetSchedule = schedules.find(schedule => schedule.date === targetDate);
    if (!sourceSchedule) {
      setDragDate(null);
      return;
    }

    if (targetSchedule && targetSchedule.user_id === sourceSchedule.user_id) {
      setDragDate(null);
      return;
    }

    setDragDate(null);
    setPendingDragAction(
      targetSchedule
        ? {
            type: 'swap',
            sourceDate: dragDate,
            targetDate,
            sourceUserName: sourceSchedule.user.name,
            targetUserName: targetSchedule.user.name,
          }
        : {
            type: 'move',
            sourceDate: dragDate,
            targetDate,
            sourceUserName: sourceSchedule.user.name,
            targetUserName: null,
          }
    );
  };

  const handleConfirmDragAction = async (reason: string) => {
    if (!pendingDragAction) {
      return;
    }

    const result = pendingDragAction.type === 'swap'
      ? await swapSchedules(pendingDragAction.sourceDate, pendingDragAction.targetDate, reason)
      : await moveSchedule(pendingDragAction.sourceDate, pendingDragAction.targetDate, reason);

    if (!result.success) {
      const errorMessage = 'error' in result && typeof result.error === 'string'
        ? result.error
        : '调整排班失败';
      throw new Error(errorMessage);
    }

    setPendingDragAction(null);
    await loadData();
  };

  const goToPrevMonth = () => {
    setSelectedDates(new Set());
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setSelectedDates(new Set());
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setSelectedDates(new Set());
    setCurrentMonth(today);
  };

  const handleToggleDisplayMode = () => {
    hasCustomizedDisplayModeRef.current = true;
    setDisplayMode(current => (current === 'avatar' ? 'name' : 'avatar'));
  };

  const selectedCount = selectedDates.size;
  const hasCurrentMonthSchedules = currentMonthSchedules.length > 0;
  const hasSelectedSchedules = selectedCount > 0;

  return (
    <div className="space-y-4">
      {moveSourceDate ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-foreground">
            正在移动 <span className="font-medium">{moveSourceDate}</span> 的排班，请点击目标日期。
          </div>
          <Button variant="outline" size="sm" onClick={() => setMoveSourceDate(null)}>
            取消移动
          </Button>
        </div>
      ) : null}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">值班日历</h2>
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {canManage ? (
            <>
              <span className="mr-1 text-sm text-muted-foreground">已选择 {selectedCount} 天</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectCurrentMonth}
                disabled={!hasCurrentMonthSchedules}
              >
                全选当月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={!hasSelectedSchedules}
              >
                取消选择
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={!hasSelectedSchedules}
              >
                批量删除
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDisplayMode}
            title={displayMode === 'avatar' ? '切换为姓名' : '切换为头像'}
          >
            {displayMode === 'avatar' ? (
              <UserIcon className="w-4 h-4" />
            ) : (
              <UserCircle className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={goToPrevMonth} aria-label="上个月">
            <ChevronLeft className="w-4 h-4" />
            <span className="ml-1 text-xs sm:text-sm">{isMobileSingleMonthLayout ? '上个月' : '上月'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth} aria-label="下个月">
            <span className="mr-1 text-xs sm:text-sm">{isMobileSingleMonthLayout ? '下个月' : '下月'}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className={isMobileSingleMonthLayout ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 gap-6 lg:grid-cols-2'}>
        <MonthCalendar
          month={currentMonth}
          schedules={currentMonthSchedules}
          users={users}
          today={today}
          displayMode={displayMode}
          dragDate={dragDate}
          selectedDates={selectedDates}
          onCellClick={handleCellClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          canManage={canManage}
        />
        {isMobileSingleMonthLayout ? null : (
          <MonthCalendar
            month={nextMonth}
            schedules={nextMonthSchedules}
            users={users}
            today={today}
            displayMode={displayMode}
            dragDate={dragDate}
            selectedDates={selectedDates}
            onCellClick={handleCellClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            canManage={canManage}
          />
        )}
      </div>

      {canManage ? (
        <UserSelectDialog
          open={dialogOpen}
          users={users}
          onSelect={handleReplace}
          onMove={handleMoveStart}
          onDelete={handleDelete}
          canDelete={selectedHasSchedule}
          canMove={selectedHasSchedule}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}

      {pendingDragAction ? (
        <ScheduleAdjustmentReasonDialog
          open
          actionType={pendingDragAction.type}
          sourceDate={pendingDragAction.sourceDate}
          targetDate={pendingDragAction.targetDate}
          sourceUserName={pendingDragAction.sourceUserName}
          targetUserName={pendingDragAction.targetUserName}
          onConfirm={handleConfirmDragAction}
          onClose={() => setPendingDragAction(null)}
        />
      ) : null}
    </div>
  );
}

// src/components/CalendarView.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarCell } from './CalendarCell';
import { CalendarContextMenu, type CalendarContextMenuAction } from './CalendarContextMenu';
import { AutoScheduleDialog } from './AutoScheduleDialog';
import { EmptyScheduleState } from './EmptyScheduleState';
import { ScheduleAdjustmentReasonDialog } from './ScheduleAdjustmentReasonDialog';
import { SelectedSchedulesActionBar } from './SelectedSchedulesActionBar';
import { UserSelectDialog } from './UserSelectDialog';
import { autoScheduleFromDateAction, batchDeleteSchedules, moveSchedule, moveScheduleDirect, removeSchedule, replaceSchedule, replaceSchedules, swapSchedules, swapSchedulesDirect } from '@/app/actions/schedule';
import { exportSelectedSchedulesToXLSX } from '@/app/actions/export';
import { useSchedules, useInvalidateSchedules } from '@/hooks/useSchedules';
import { useAssignableUsers } from '@/hooks/useUsers';
import type { AutoScheduleStartMode, ScheduleWithUser, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User as UserIcon, UserCircle } from 'lucide-react';

interface CalendarViewProps {
  refreshKey: number;
  canManage: boolean;
  onRequestGenerate?: () => void;
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

type ContextMenuState = {
  date: string;
  hasSchedule: boolean;
  x: number;
  y: number;
  triggerId: string;
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
  onCellContextMenu: (date: Date, schedule: ScheduleWithUser | undefined, event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (date: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (date: string) => void;
  canManage: boolean;
}

const MonthCalendar = memo(function MonthCalendar({
  month,
  schedules,
  today,
  displayMode,
  dragDate,
  selectedDates,
  onCellClick,
  onCellContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  canManage,
}: MonthCalendarProps) {
  // 使用 useMemo 缓存日期计算
  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [month]);

  // 使用 useMemo 缓存 schedule 查找 map
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleWithUser>();
    for (const schedule of schedules) {
      map.set(schedule.date, schedule);
    }
    return map;
  }, [schedules]);

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
          const schedule = scheduleMap.get(dateStr);
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
              onContextMenu={event => onCellContextMenu(day, schedule, event)}
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
});

export function CalendarView({ refreshKey, canManage, onRequestGenerate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedHasSchedule, setSelectedHasSchedule] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [moveSourceDate, setMoveSourceDate] = useState<string | null>(null);
  const [pendingDragAction, setPendingDragAction] = useState<PendingDragAction | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('avatar');
  const [isMobileSingleMonthLayout, setIsMobileSingleMonthLayout] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [autoScheduleDate, setAutoScheduleDate] = useState<string | null>(null);
  const [autoScheduleError, setAutoScheduleError] = useState<string | null>(null);
  const hasCustomizedDisplayModeRef = useRef(false);
  const contextMenuTriggerRef = useRef<HTMLElement | null>(null);

  const today = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  // 使用 React Query hooks
  const { data: schedules = [], isLoading: isLoadingSchedules, refetch: refetchSchedules } = useSchedules(currentMonth);
  const { data: users = [], isLoading: isLoadingUsers } = useAssignableUsers();
  const invalidateSchedules = useInvalidateSchedules();

  const isLoading = isLoadingSchedules || isLoadingUsers;

  // 刷新数据时失效缓存
  const refreshData = useCallback(async () => {
    await invalidateSchedules();
    await refetchSchedules();
  }, [invalidateSchedules, refetchSchedules]);

  // 当 refreshKey 变化时刷新数据
  useEffect(() => {
    if (refreshKey > 0) {
      queueMicrotask(() => {
        void refreshData();
      });
    }
  }, [refreshKey, refreshData]);

  // 当 schedules 变化时更新选中状态
  useEffect(() => {
    setSelectedDates(current => {
      const availableDates = new Set(schedules.map(schedule => schedule.date));
      return new Set([...current].filter(date => availableDates.has(date)));
    });
  }, [schedules]);

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
      if (matches) {
        setSelectedDates(current => new Set(
          [...current].filter(date => isSameMonth(new Date(date), currentMonth))
        ));
      }
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
  }, [currentMonth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const syncPointerType = (matches: boolean) => {
      setIsTouchDevice(matches || window.navigator.maxTouchPoints > 0);
    };

    syncPointerType(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      const handleChange = (event: MediaQueryListEvent) => {
        syncPointerType(event.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    const legacyListener = (event: MediaQueryListEvent) => {
      syncPointerType(event.matches);
    };
    mediaQuery.addListener(legacyListener);
    return () => {
      mediaQuery.removeListener(legacyListener);
    };
  }, []);

  // 使用 useMemo 缓存筛选后的排班数据
  const { currentMonthSchedules, nextMonthSchedules, scheduleDateSet } = useMemo(() => {
    const current: ScheduleWithUser[] = [];
    const next: ScheduleWithUser[] = [];
    const dateSet = new Set<string>();

    for (const schedule of schedules) {
      dateSet.add(schedule.date);
      const date = new Date(schedule.date);
      if (isSameMonth(date, currentMonth)) {
        current.push(schedule);
      } else if (isSameMonth(date, nextMonth)) {
        next.push(schedule);
      }
    }

    return { currentMonthSchedules: current, nextMonthSchedules: next, scheduleDateSet: dateSet };
  }, [schedules, currentMonth, nextMonth]);

  const handleCellClick = (date: Date, event: React.MouseEvent<HTMLDivElement>) => {
    setContextMenuState(null);
    if (!canManage) {
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasSchedule = scheduleDateSet.has(dateStr);
    const isMultiSelect = event.metaKey || event.ctrlKey;

    if (moveSourceDate) {
      if (moveSourceDate === dateStr) {
        setMoveSourceDate(null);
        return;
      }

      void (async () => {
        const targetHasSchedule = scheduleDateSet.has(dateStr);
        if (targetHasSchedule) {
          await swapSchedulesDirect(moveSourceDate, dateStr);
        } else {
          await moveScheduleDirect(moveSourceDate, dateStr);
        }

        setMoveSourceDate(null);
        await refreshData();
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

  const handleCellContextMenu = (
    date: Date,
    schedule: ScheduleWithUser | undefined,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!canManage || isTouchDevice || dragDate || moveSourceDate) {
      return;
    }

    event.preventDefault();
    const dateStr = format(date, 'yyyy-MM-dd');
    contextMenuTriggerRef.current = event.currentTarget;
    const triggerId = `calendar-cell-${dateStr}`;
    event.currentTarget.id = triggerId;
    setContextMenuState({
      date: dateStr,
      hasSchedule: Boolean(schedule),
      x: event.clientX,
      y: event.clientY,
      triggerId,
    });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuState(null);
    const trigger = contextMenuTriggerRef.current;
    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
      });
    }
  }, []);

  const handleReplace = async (userId: number) => {
    if (!canManage) {
      return;
    }
    if (!selectedDate) return;
    await replaceSchedule(selectedDate, userId);
    setDialogOpen(false);
    setSelectedHasSchedule(false);
    void refreshData();
  };

  const handleDelete = async () => {
    if (!canManage || !selectedDate) {
      return;
    }

    await removeSchedule(selectedDate);
    setDialogOpen(false);
    setSelectedHasSchedule(false);
    await refreshData();
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
    await refreshData();
  };

  const handleBatchEdit = async (userId: number) => {
    if (!canManage || selectedDates.size === 0) {
      return;
    }

    const result = await replaceSchedules([...selectedDates], userId);
    if (!result.success) {
      return;
    }

    setBatchEditOpen(false);
    setSelectedDates(new Set());
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedHasSchedule(false);
    await refreshData();
  };

  const handleExportSelected = async () => {
    if (!canManage || selectedDates.size === 0) {
      return;
    }

    const file = await exportSelectedSchedulesToXLSX([...selectedDates]);
    const bytes = Uint8Array.from(atob(file.content), char => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName;
    link.click();
    URL.revokeObjectURL(url);
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
    await refreshData();
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

  const handleContextMenuAction = (action: CalendarContextMenuAction) => {
    if (!contextMenuState) {
      return;
    }

    const targetDate = contextMenuState.date;
    const hasSchedule = contextMenuState.hasSchedule;
    setContextMenuState(null);
    setSelectedDates(new Set());
    setSelectedDate(targetDate);
    setSelectedHasSchedule(hasSchedule);

    if (action === 'auto_schedule') {
      setAutoScheduleError(null);
      setAutoScheduleDate(targetDate);
      return;
    }

    if (action === 'assign_user' || action === 'replace_user') {
      setDialogOpen(true);
      return;
    }

    if (action === 'move_schedule') {
      setMoveSourceDate(targetDate);
      return;
    }

    if (action === 'delete_schedule') {
      void (async () => {
        await removeSchedule(targetDate);
        await refreshData();
      })();
    }
  };

  const handleAutoSchedule = async (input: { days: number; startMode: AutoScheduleStartMode }) => {
    if (!autoScheduleDate) {
      return;
    }

    const result = await autoScheduleFromDateAction(autoScheduleDate, input.days, input.startMode);
    if (!result.success) {
      setAutoScheduleError(result.error ?? '自动排班失败');
      return;
    }

    setAutoScheduleError(null);
    setAutoScheduleDate(null);
    await refreshData();
  };

  const selectedCount = selectedDates.size;
  const hasCurrentMonthSchedules = currentMonthSchedules.length > 0;
  const hasSelectedSchedules = selectedCount > 0;
  const hasVisibleSchedules = isMobileSingleMonthLayout
    ? currentMonthSchedules.length > 0
    : currentMonthSchedules.length > 0 || nextMonthSchedules.length > 0;

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

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                <div className="h-4 w-4 mx-auto bg-muted animate-pulse rounded" />
              </div>
            ))}
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="min-h-[50px] sm:min-h-[80px] rounded border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      ) : !hasVisibleSchedules ? (
        <EmptyScheduleState
          canManage={canManage}
          onRequestGenerate={onRequestGenerate}
        />
      ) : null}

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
          onCellContextMenu={handleCellContextMenu}
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
            onCellContextMenu={handleCellContextMenu}
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

      {canManage ? (
        <UserSelectDialog
          open={batchEditOpen}
          users={users}
          onSelect={handleBatchEdit}
          onClose={() => setBatchEditOpen(false)}
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

      <CalendarContextMenu
        open={contextMenuState !== null}
        x={contextMenuState?.x ?? 0}
        y={contextMenuState?.y ?? 0}
        hasSchedule={contextMenuState?.hasSchedule ?? false}
        labelledBy={contextMenuState?.triggerId}
        onSelect={handleContextMenuAction}
        onClose={handleCloseContextMenu}
      />

      {autoScheduleDate ? (
        <AutoScheduleDialog
          key={autoScheduleDate}
          open
          startDate={autoScheduleDate}
          defaultDays={users.filter(user => user.is_active).length}
          error={autoScheduleError}
          onClose={() => {
            setAutoScheduleError(null);
            setAutoScheduleDate(null);
          }}
          onConfirm={handleAutoSchedule}
        />
      ) : null}

      {canManage && hasSelectedSchedules ? (
        <SelectedSchedulesActionBar
          selectedCount={selectedCount}
          onBatchEdit={() => setBatchEditOpen(true)}
          onExportSelected={() => {
            void handleExportSelected();
          }}
          onBatchDelete={() => {
            void handleBatchDelete();
          }}
        />
      ) : null}
    </div>
  );
}

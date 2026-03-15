// src/components/CalendarView.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarCell } from './CalendarCell';
import { UserSelectDialog } from './UserSelectDialog';
import { getSchedules, moveSchedule, removeSchedule, replaceSchedule, swapSchedules } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User as UserIcon, UserCircle } from 'lucide-react';

interface CalendarViewProps {
  refreshKey: number;
  canManage: boolean;
}

type DisplayMode = 'avatar' | 'name';

interface MonthCalendarProps {
  month: Date;
  schedules: ScheduleWithUser[];
  users: User[];
  today: Date;
  displayMode: DisplayMode;
  dragDate: string | null;
  onCellClick: (date: Date) => void;
  onDragStart: (date: string) => void;
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
  onCellClick,
  onDragStart,
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
              onClick={() => onCellClick(day)}
              onDragStart={() => onDragStart(dateStr)}
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
  const [selectedHasSchedule, setSelectedHasSchedule] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('avatar');

  const today = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  const loadData = useCallback(async () => {
    // 加载本月和下月的数据
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
    const [scheduleData, userData] = await Promise.all([
      getSchedules(start, end),
      getUsers(),
    ]);
    setSchedules(scheduleData);
    setUsers(userData);
  }, [currentMonth]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData, refreshKey]);

  // 筛选本月和下月的排班
  const currentMonthSchedules = schedules.filter(s => {
    const date = new Date(s.date);
    return isSameMonth(date, currentMonth);
  });

  const nextMonthSchedules = schedules.filter(s => {
    const date = new Date(s.date);
    return isSameMonth(date, nextMonth);
  });

  const handleCellClick = (date: Date) => {
    if (!canManage) {
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedHasSchedule(schedules.some(schedule => schedule.date === dateStr));
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

  const handleDragStart = (date: string) => {
    if (!canManage) {
      return;
    }
    setDragDate(date);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetDate: string) => {
    if (!canManage) {
      return;
    }
    if (!dragDate || dragDate === targetDate) return;

    const targetHasSchedule = schedules.some(schedule => schedule.date === targetDate);
    if (targetHasSchedule) {
      await swapSchedules(dragDate, targetDate);
    } else {
      await moveSchedule(dragDate, targetDate);
    }

    setDragDate(null);
    loadData();
  };

  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(today);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">值班日历</h2>
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayMode(displayMode === 'avatar' ? 'name' : 'avatar')}
            title={displayMode === 'avatar' ? '切换为姓名' : '切换为头像'}
          >
            {displayMode === 'avatar' ? (
              <UserIcon className="w-4 h-4" />
            ) : (
              <UserCircle className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">上月</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <span className="hidden sm:inline mr-1">下月</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 双月日历布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthCalendar
          month={currentMonth}
          schedules={currentMonthSchedules}
          users={users}
          today={today}
          displayMode={displayMode}
          dragDate={dragDate}
          onCellClick={handleCellClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          canManage={canManage}
        />
        <MonthCalendar
          month={nextMonth}
          schedules={nextMonthSchedules}
          users={users}
          today={today}
          displayMode={displayMode}
          dragDate={dragDate}
          onCellClick={handleCellClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          canManage={canManage}
        />
      </div>

      {canManage ? (
        <UserSelectDialog
          open={dialogOpen}
          users={users}
          onSelect={handleReplace}
          onDelete={handleDelete}
          canDelete={selectedHasSchedule}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}

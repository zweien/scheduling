// src/components/CalendarView.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarCell } from './CalendarCell';
import { UserSelectDialog } from './UserSelectDialog';
import { getSchedules, replaceSchedule, swapSchedules } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  refreshKey: number;
}

type SlideDirection = 'none' | 'left' | 'right';

export function CalendarView({ refreshKey }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('none');

  const today = new Date();

  const loadData = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const [scheduleData, userData] = await Promise.all([
      getSchedules(start, end),
      getUsers(),
    ]);
    setSchedules(scheduleData);
    setUsers(userData);
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleCellClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const handleReplace = async (userId: number) => {
    if (!selectedDate) return;
    await replaceSchedule(selectedDate, userId);
    setDialogOpen(false);
    loadData();
  };

  const handleDragStart = (date: string) => {
    setDragDate(date);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetDate: string) => {
    if (!dragDate || dragDate === targetDate) return;
    await swapSchedules(dragDate, targetDate);
    setDragDate(null);
    loadData();
  };

  const goToPrevMonth = () => {
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentMonth(subMonths(currentMonth, 1));
      setSlideDirection('none');
    }, 50);
  };

  const goToNextMonth = () => {
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentMonth(addMonths(currentMonth, 1));
      setSlideDirection('none');
    }, 50);
  };

  const goToToday = () => {
    const direction = currentMonth < today ? 'left' : 'right';
    setSlideDirection(direction);
    setTimeout(() => {
      setCurrentMonth(today);
      setSlideDirection('none');
    }, 50);
  };

  const slideClass = slideDirection === 'left' ? 'animate-slide-left' :
                     slideDirection === 'right' ? 'animate-slide-right' : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </h2>
        <div className="flex gap-1 sm:gap-2">
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

      <div className={`grid grid-cols-7 gap-0.5 sm:gap-1 ${slideClass}`}>
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const schedule = schedules.find(s => s.date === dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const animationDelay = Math.min(index * 8, 200);

          if (!isCurrentMonth) {
            return (
              <div key={dateStr} className="min-h-[50px] sm:min-h-[80px] p-1 sm:p-2 border rounded border-border bg-muted/30 opacity-50">
                <div className="text-xs sm:text-sm text-muted-foreground">{format(day, 'd')}</div>
              </div>
            );
          }

          return (
            <CalendarCell
              key={dateStr}
              date={day}
              schedule={schedule}
              isToday={isSameDay(day, today)}
              onClick={() => handleCellClick(day)}
              onDragStart={() => handleDragStart(dateStr)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(dateStr)}
              isDragSource={dragDate === dateStr}
              isDropTarget={dragDate !== null && dragDate !== dateStr}
              animationDelay={animationDelay}
            />
          );
        })}
      </div>

      <UserSelectDialog
        open={dialogOpen}
        users={users}
        onSelect={handleReplace}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

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

interface CalendarViewProps {
  refreshKey: number;
}

export function CalendarView({ refreshKey }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            上月
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(today)}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            下月
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const schedule = schedules.find(s => s.date === dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          if (!isCurrentMonth) {
            return (
              <div key={dateStr} className="min-h-[80px] p-2 border rounded border-gray-100 bg-gray-50 opacity-50">
                <div className="text-sm text-gray-300">{format(day, 'd')}</div>
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

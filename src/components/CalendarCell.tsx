// src/components/CalendarCell.tsx
'use client';

import type { ScheduleWithUser } from '@/types';

interface CalendarCellProps {
  date: Date;
  schedule?: ScheduleWithUser;
  isToday: boolean;
  onClick: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

export function CalendarCell({ date, schedule, isToday, onClick, onDragStart, onDragOver, onDrop }: CalendarCellProps) {
  const day = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      onClick={onClick}
      draggable={!!schedule}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        min-h-[80px] p-2 border rounded cursor-pointer transition-colors
        ${isToday ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-200'}
        ${isWeekend ? 'bg-gray-50' : 'bg-white'}
        ${schedule ? 'hover:border-blue-300' : ''}
        ${schedule?.is_manual ? 'bg-amber-50' : ''}
      `}
    >
      <div className={`text-sm font-medium ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
        {day}
      </div>
      {schedule && (
        <div className="mt-1 text-xs text-blue-600 font-medium truncate">
          {schedule.user.name}
          {schedule.is_manual && <span className="ml-1 text-amber-500">*</span>}
        </div>
      )}
    </div>
  );
}

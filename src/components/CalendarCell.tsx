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
        min-h-[50px] sm:min-h-[80px] p-1 sm:p-2 border rounded cursor-pointer transition-colors
        ${isToday ? 'border-primary border-2 bg-primary/10' : 'border-border'}
        ${isWeekend ? 'bg-muted/50' : 'bg-background'}
        ${schedule ? 'hover:border-primary/50' : ''}
        ${schedule?.is_manual ? 'bg-amber-500/10' : ''}
      `}
    >
      <div className={`text-xs sm:text-sm font-medium ${isWeekend ? 'text-muted-foreground' : 'text-foreground'}`}>
        {day}
      </div>
      {schedule && (
        <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-primary font-medium truncate">
          {schedule.user.name}
          {schedule.is_manual && <span className="ml-0.5 text-amber-500">*</span>}
        </div>
      )}
    </div>
  );
}

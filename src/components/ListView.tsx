// src/components/ListView.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { replaceSchedule } from '@/app/actions/schedule';
import { useSchedules, useInvalidateSchedules } from '@/hooks/useSchedules';
import { useAssignableUsers } from '@/hooks/useUsers';
import type { ScheduleWithUser } from '@/types';
import { EmptyScheduleState } from './EmptyScheduleState';
import { UserSelectDialog } from './UserSelectDialog';
import { Card } from '@/components/ui/card';

interface ListViewProps {
  refreshKey: number;
  canManage: boolean;
  onRequestGenerate?: () => void;
}

// 列表行组件 - 使用 memo 优化
const ScheduleRow = memo(function ScheduleRow({
  schedule,
  canManage,
  onClick,
}: {
  schedule: ScheduleWithUser;
  canManage: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={canManage ? onClick : undefined}
      className={`flex items-center justify-between p-3 ${canManage ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
    >
      <div>
        <div className="font-medium">
          {format(parseISO(schedule.date), 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <div className="text-sm text-muted-foreground">
          {schedule.is_manual && <span className="text-amber-500 mr-1">* 手动调整</span>}
        </div>
      </div>
      <div className="text-primary font-medium">{schedule.user.name}</div>
    </div>
  );
});

export function ListView({ refreshKey, canManage, onRequestGenerate }: ListViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 使用 React Query hooks
  const today = useMemo(() => new Date(), []);
  const { data: schedules = [], refetch } = useSchedules(today);
  const { data: users = [] } = useAssignableUsers();
  const invalidateSchedules = useInvalidateSchedules();

  // 刷新数据
  const refreshData = useCallback(async () => {
    await invalidateSchedules();
    await refetch();
  }, [invalidateSchedules, refetch]);

  // 当 refreshKey 变化时刷新数据
  useEffect(() => {
    if (refreshKey > 0) {
      queueMicrotask(() => {
        void refreshData();
      });
    }
  }, [refreshKey, refreshData]);

  const handleRowClick = (date: string) => {
    if (!canManage) {
      return;
    }
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleReplace = async (userId: number) => {
    if (!selectedDate) return;
    await replaceSchedule(selectedDate, userId);
    setDialogOpen(false);
    void refreshData();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">值班列表</h2>

      {schedules.length === 0 ? (
        <EmptyScheduleState
          canManage={canManage}
          onRequestGenerate={onRequestGenerate}
        />
      ) : (
        <Card className="divide-y">
          {schedules.map(schedule => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              canManage={canManage}
              onClick={() => handleRowClick(schedule.date)}
            />
          ))}
        </Card>
      )}

      {canManage ? (
        <UserSelectDialog
          open={dialogOpen}
          users={users}
          onSelect={handleReplace}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}

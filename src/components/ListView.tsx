// src/components/ListView.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getSchedules, replaceSchedule } from '@/app/actions/schedule';
import { getAssignableUsers } from '@/app/actions/users';
import type { ScheduleWithUser, User } from '@/types';
import { UserSelectDialog } from './UserSelectDialog';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ListViewProps {
  refreshKey: number;
  canManage: boolean;
}

export function ListView({ refreshKey, canManage }: ListViewProps) {
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    const today = new Date();
    const start = format(today, 'yyyy-MM-01');
    const end = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
    const [scheduleData, userData] = await Promise.all([
      getSchedules(start, end),
      getAssignableUsers(),
    ]);
    setSchedules(scheduleData);
    setUsers(userData);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData, refreshKey]);

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
    toast.success('排班已更新');
    setDialogOpen(false);
    loadData();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">值班列表</h2>

      {schedules.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">暂无排班数据</p>
          <p className="text-xs mt-1">点击左侧生成排班开始</p>
        </div>
      ) : (
        <Card className="divide-y">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              onClick={() => handleRowClick(schedule.date)}
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

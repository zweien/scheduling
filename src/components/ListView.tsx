// src/components/ListView.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { replaceSchedule } from '@/app/actions/schedule';
import { replaceLeaderSchedule, getLeadersForSelect } from '@/app/actions/leader-schedules';
import { useSchedules, useInvalidateSchedules } from '@/hooks/useSchedules';
import { useAssignableUsers } from '@/hooks/useUsers';
import { useLeaderSchedules, useInvalidateLeaderSchedules } from '@/hooks/useLeaderSchedules';
import type { ScheduleWithUser, LeaderScheduleWithLeader, Leader } from '@/types';
import { EmptyScheduleState } from './EmptyScheduleState';
import { UserSelectDialog } from './UserSelectDialog';
import { LeaderSelectDialog } from './LeaderSelectDialog';
import { Card } from '@/components/ui/card';

interface ListViewProps {
  refreshKey: number;
  canManage: boolean;
  onRequestGenerate?: () => void;
}

// 列表行组件 - 使用 memo 优化
const ScheduleRow = memo(function ScheduleRow({
  schedule,
  leaderSchedule,
  canManage,
  onDutyClick,
  onLeaderClick,
}: {
  schedule: ScheduleWithUser;
  leaderSchedule?: LeaderScheduleWithLeader;
  canManage: boolean;
  onDutyClick: () => void;
  onLeaderClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 gap-4">
      <div className="flex-shrink-0">
        <div className="font-medium">
          {format(parseISO(schedule.date), 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <div className="text-sm text-muted-foreground">
          {schedule.is_manual && <span className="text-amber-500 mr-1">* 手动调整</span>}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* 值班员列 */}
        <div
          onClick={canManage ? (e) => { e.stopPropagation(); onDutyClick(); } : undefined}
          className={`min-w-[80px] text-right ${canManage ? 'hover:bg-muted/50 cursor-pointer rounded px-2 py-1 -mx-2 -my-1' : ''}`}
          title={canManage ? '点击修改值班员' : undefined}
        >
          <span className="text-primary font-medium">{schedule.user.name}</span>
        </div>
        {/* 值班领导列 */}
        <div
          onClick={canManage ? (e) => { e.stopPropagation(); onLeaderClick(); } : undefined}
          className={`min-w-[80px] text-right ${canManage ? 'hover:bg-muted/50 cursor-pointer rounded px-2 py-1 -mx-2 -my-1' : ''}`}
          title={canManage ? '点击修改值班领导' : undefined}
        >
          {leaderSchedule ? (
            <span className="text-blue-600 dark:text-blue-400 font-medium">{leaderSchedule.leader.name}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </div>
    </div>
  );
});

export function ListView({ refreshKey, canManage, onRequestGenerate }: ListViewProps) {
  // 值班员相关状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 值班领导相关状态
  const [selectedLeaderDate, setSelectedLeaderDate] = useState<string | null>(null);
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  // 使用 React Query hooks
  const today = useMemo(() => new Date(), []);
  const { data: schedules = [], refetch } = useSchedules(today);
  const { data: users = [] } = useAssignableUsers();
  const { data: leaderSchedules = [] } = useLeaderSchedules(today);
  const invalidateSchedules = useInvalidateSchedules();
  const invalidateLeaderSchedules = useInvalidateLeaderSchedules();

  // 获取领导列表
  useEffect(() => {
    getLeadersForSelect().then(result => {
      if (Array.isArray(result)) {
        setLeaders(result);
      }
    });
  }, []);

  // 将领导排班数据转为 Map 便于查找
  const leaderScheduleMap = useMemo(() => {
    const map = new Map<string, LeaderScheduleWithLeader>();
    for (const ls of leaderSchedules) {
      map.set(ls.date, ls);
    }
    return map;
  }, [leaderSchedules]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await invalidateSchedules();
    await invalidateLeaderSchedules();
    await refetch();
  }, [invalidateSchedules, invalidateLeaderSchedules, refetch]);

  // 当 refreshKey 变化时刷新数据
  useEffect(() => {
    if (refreshKey > 0) {
      queueMicrotask(() => {
        void refreshData();
      });
    }
  }, [refreshKey, refreshData]);

  // 值班员点击处理
  const handleDutyClick = (date: string) => {
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

  // 值班领导点击处理
  const handleLeaderClick = (date: string) => {
    if (!canManage) {
      return;
    }
    setSelectedLeaderDate(date);
    setLeaderDialogOpen(true);
  };

  const handleReplaceLeader = async (leaderId: number) => {
    if (!selectedLeaderDate) return;
    await replaceLeaderSchedule(selectedLeaderDate, leaderId);
    setLeaderDialogOpen(false);
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
          {/* 表头 */}
          <div className="flex items-center justify-between p-3 gap-4 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div className="flex-shrink-0">日期</div>
            <div className="flex items-center gap-4 flex-1 justify-end">
              <div className="min-w-[80px] text-right">值班员</div>
              <div className="min-w-[80px] text-right">领导</div>
            </div>
          </div>
          {/* 数据行 */}
          {schedules.map(schedule => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              leaderSchedule={leaderScheduleMap.get(schedule.date)}
              canManage={canManage}
              onDutyClick={() => handleDutyClick(schedule.date)}
              onLeaderClick={() => handleLeaderClick(schedule.date)}
            />
          ))}
        </Card>
      )}

      {canManage ? (
        <>
          <UserSelectDialog
            open={dialogOpen}
            users={users}
            onSelect={handleReplace}
            onClose={() => setDialogOpen(false)}
          />
          <LeaderSelectDialog
            open={leaderDialogOpen}
            leaders={leaders}
            onSelect={handleReplaceLeader}
            onClose={() => setLeaderDialogOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}

// src/components/StatisticsDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStats } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import { getAvatarColor, getAvatarInitial } from '@/lib/avatar';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface StatisticsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface StatItem {
  userId: number;
  userName: string;
  count: number;
}

type TimeRange = 'month' | 'all';

export function StatisticsDialog({ open, onClose }: StatisticsDialogProps) {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    if (open) {
      loadStats();
      getUsers().then(data => setUserCount(data.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timeRange]);

  const loadStats = async () => {
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (timeRange === 'month') {
      const now = new Date();
      startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    }

    const statsData = await getStats(startDate, endDate);
    setStats(statsData);
  };

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const mostDuty = sortedStats[0];
  const leastDuty = sortedStats[sortedStats.length - 1];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>值班统计</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 时间范围切换 */}
          <div className="flex border rounded-lg p-1">
            <button
              onClick={() => setTimeRange('month')}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              本月
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              全部
            </button>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-primary/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-primary tabular-nums">{totalCount}</div>
              <div className="text-sm text-muted-foreground">总值班次数</div>
            </div>
            <div className="bg-success/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-success tabular-nums">{userCount}</div>
              <div className="text-sm text-muted-foreground">值班人数</div>
            </div>
          </div>

          {/* 柱状图 */}
          {stats.length > 0 && (
            <>
              <div className="text-sm font-medium text-foreground">人员对比</div>
              <div className="space-y-3">
                {stats.map(stat => (
                  <div key={stat.userId} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: getAvatarColor(stat.userName) }}
                        >
                          {getAvatarInitial(stat.userName)}
                        </div>
                        <span>{stat.userName}</span>
                      </div>
                      <span className="font-medium tabular-nums">{stat.count} 次</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(stat.count / maxCount) * 100}%`,
                          backgroundColor: getAvatarColor(stat.userName),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 最值对比 */}
              {mostDuty && leastDuty && (
                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                  <div className="bg-warning/10 p-3 rounded-lg">
                    <div className="text-warning text-xs mb-1">最多值班</div>
                    <div className="font-medium">{mostDuty.userName}</div>
                    <div className="text-muted-foreground tabular-nums">{mostDuty.count} 次</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">最少值班</div>
                    <div className="font-medium">{leastDuty.userName}</div>
                    <div className="text-muted-foreground tabular-nums">{leastDuty.count} 次</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

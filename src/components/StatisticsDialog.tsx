// src/components/StatisticsDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStats } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';

interface StatisticsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface StatItem {
  userId: number;
  userName: string;
  count: number;
}

export function StatisticsDialog({ open, onClose }: StatisticsDialogProps) {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    if (open) {
      Promise.all([getStats(), getUsers()]).then(([statsData, usersData]) => {
        setStats(statsData);
        setUserCount(usersData.length);
      });
    }
  }, [open]);

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const mostDuty = sortedStats[0];
  const leastDuty = sortedStats[sortedStats.length - 1];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>值班统计</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-sm text-gray-500">总值班次数</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{userCount}</div>
              <div className="text-sm text-gray-500">值班人数</div>
            </div>
          </div>

          {stats.length > 0 && (
            <>
              <div className="text-sm font-medium text-gray-700">人员对比</div>
              <div className="space-y-2">
                {stats.map(stat => (
                  <div key={stat.userId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{stat.userName}</span>
                      <span className="font-medium">{stat.count} 次</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(stat.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {mostDuty && leastDuty && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-amber-50 p-2 rounded">
                    <span className="text-amber-600">最多：</span>
                    <span className="font-medium">{mostDuty.userName} ({mostDuty.count}次)</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500">最少：</span>
                    <span className="font-medium">{leastDuty.userName} ({leastDuty.count}次)</span>
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

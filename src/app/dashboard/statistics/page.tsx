// src/app/dashboard/statistics/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStats } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';
import { getAvatarColor, getAvatarInitial } from '@/lib/avatar';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { BarChart3, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

interface StatItem {
  userId: number;
  userName: string;
  count: number;
  dates: string[];
}

type TimeRange = 'month' | 'lastMonth' | 'year' | 'all' | 'custom';

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  const loadUsers = useCallback(async () => {
    const userData = await getUsers();
    setUsers(userData);
    setUserCount(userData.length);
  }, []);

  const loadStats = useCallback(async () => {
    let startDate: string | undefined;
    let endDate: string | undefined;

    const now = new Date();

    switch (timeRange) {
      case 'month':
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'year':
        startDate = format(startOfYear(now), 'yyyy-MM-dd');
        endDate = format(endOfYear(now), 'yyyy-MM-dd');
        break;
      case 'custom':
        if (customStart && customEnd) {
          startDate = customStart;
          endDate = customEnd;
        }
        break;
      case 'all':
      default:
        break;
    }

    const statsData = await getStats(startDate, endDate);

    // 按用户筛选
    let filteredStats = statsData;
    if (selectedUser !== null) {
      filteredStats = statsData.filter(s => s.userId === selectedUser);
    }

    setStats(filteredStats);
  }, [timeRange, customStart, customEnd, selectedUser]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers();
    });
  }, [loadUsers]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
    });
  }, [loadStats]);

  const toggleUserExpand = (userId: number) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const mostDuty = sortedStats[0];
  const leastDuty = sortedStats.length > 1 ? sortedStats[sortedStats.length - 1] : null;

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'month':
        return format(new Date(), 'yyyy年M月', { locale: zhCN });
      case 'lastMonth':
        return format(subMonths(new Date(), 1), 'yyyy年M月', { locale: zhCN });
      case 'year':
        return format(new Date(), 'yyyy年', { locale: zhCN });
      case 'custom':
        if (customStart && customEnd) {
          return `${customStart} 至 ${customEnd}`;
        }
        return '自定义';
      default:
        return '全部时间';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header currentSection="统计" />

      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <section className="rounded-2xl border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">值班统计</h2>
              <p className="text-sm text-muted-foreground">按时间范围和人员查看值班次数与日期明细。</p>
            </div>
          </div>
        </section>
        {/* 筛选区域 */}
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div className="text-sm font-medium text-muted-foreground">筛选条件</div>

          {/* 时间范围 */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">时间范围</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'month', label: '本月' },
                { value: 'lastMonth', label: '上月' },
                { value: 'year', label: '今年' },
                { value: 'all', label: '全部' },
                { value: 'custom', label: '自定义' },
              ].map(item => (
                <Button
                  key={item.value}
                  variant={timeRange === item.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(item.value as TimeRange)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 自定义日期 */}
          {timeRange === 'custom' && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">开始日期</label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">结束日期</label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
            </div>
          )}

          {/* 人员筛选 */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">人员筛选</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedUser === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                全部人员
              </Button>
              {users.map(user => (
                <Button
                  key={user.id}
                  variant={selectedUser === user.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedUser(user.id)}
                  className="gap-1.5"
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: getAvatarColor(user.name) }}
                  >
                    {getAvatarInitial(user.name)}
                  </div>
                  {user.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 统计摘要 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary tabular-nums">{totalCount}</div>
            <div className="text-sm text-muted-foreground mt-1">总值班次数</div>
            <div className="text-xs text-muted-foreground mt-1">{getTimeRangeLabel()}</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">{userCount}</div>
            <div className="text-sm text-muted-foreground mt-1">值班人数</div>
          </div>
          {mostDuty && (
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-lg font-semibold">{mostDuty.userName}</div>
              <div className="text-sm text-muted-foreground">{mostDuty.count} 次</div>
              <div className="text-xs text-muted-foreground">最多值班</div>
            </div>
          )}
          {leastDuty && (
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="text-lg font-semibold">{leastDuty.userName}</div>
              <div className="text-sm text-muted-foreground">{leastDuty.count} 次</div>
              <div className="text-xs text-muted-foreground">最少值班</div>
            </div>
          )}
        </div>

        {/* 柱状图 */}
        {stats.length > 0 ? (
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm font-medium text-foreground mb-4">人员值班对比</div>
            <div className="space-y-4">
              {stats.map(stat => (
                <div key={stat.userId} className="space-y-2">
                  <div
                    className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/30 p-1 rounded"
                    onClick={() => toggleUserExpand(stat.userId)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm"
                        style={{ backgroundColor: getAvatarColor(stat.userName) }}
                      >
                        {getAvatarInitial(stat.userName)}
                      </div>
                      <span className="font-medium">{stat.userName}</span>
                      {expandedUsers.has(stat.userId) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg tabular-nums">{stat.count}</span>
                      <span className="text-muted-foreground ml-1">次</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({totalCount > 0 ? ((stat.count / totalCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(stat.count / maxCount) * 100}%`,
                        backgroundColor: getAvatarColor(stat.userName),
                      }}
                    />
                  </div>

                  {/* 展开的值班日期列表 */}
                  {expandedUsers.has(stat.userId) && stat.dates.length > 0 && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-2">
                        值班日期 ({stat.dates.length}天)：
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stat.dates.map((date, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded-full text-white font-medium"
                            style={{ backgroundColor: getAvatarColor(stat.userName) }}
                          >
                            {format(parseISO(date), 'M月d日', { locale: zhCN })}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无统计数据</p>
            <p className="text-sm mt-1">请调整筛选条件或先生成排班</p>
          </div>
        )}

        {/* 月份明细 */}
        {stats.length > 0 && timeRange === 'all' && (
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm font-medium text-foreground mb-4">月度趋势</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const month = new Date(new Date().getFullYear(), i, 1);
                const monthStr = format(month, 'yyyy-MM');
                return (
                  <div key={monthStr} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                    <span className="text-sm">{format(month, 'M月', { locale: zhCN })}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {stats.reduce((sum, s) => sum + s.count, 0) > 0 ? '-' : 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

// src/hooks/useLeaderSchedules.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { getLeaderSchedules } from '@/app/actions/leader-schedules';

// 获取值班领导排班数据
export function useLeaderSchedules(month: Date) {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['leaderSchedules', start, end],
    queryFn: () => getLeaderSchedules(start, end),
  });
}

// 失效所有值班领导排班缓存的 hook
export function useInvalidateLeaderSchedules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['leaderSchedules'] });
}

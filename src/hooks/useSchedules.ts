import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { getSchedules } from '@/app/actions/schedule';

// 获取排班数据
export function useSchedules(month: Date) {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['schedules', start, end],
    queryFn: () => getSchedules(start, end),
  });
}

// 获取排班数据的查询键（用于手动失效缓存）
export function getSchedulesQueryKey(month: Date) {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');
  return ['schedules', start, end] as const;
}

// 失效所有排班缓存的 hook
export function useInvalidateSchedules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['schedules'] });
}

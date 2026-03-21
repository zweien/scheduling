import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAssignableUsers } from '@/app/actions/users';

// 获取可分配用户（活跃状态）
export function useAssignableUsers() {
  return useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => getAssignableUsers(),
    staleTime: 5 * 60 * 1000, // 用户列表变化少，缓存更久
  });
}

// 失效所有用户缓存的 hook
export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['users'] });
}

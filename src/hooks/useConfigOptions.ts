import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizationOptions, getCategoryOptions } from '@/app/actions/config-options';

// 获取组织选项
export function useOrganizationOptions() {
  return useQuery({
    queryKey: ['configOptions', 'organization'],
    queryFn: () => getOrganizationOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

// 获取类别选项
export function useCategoryOptions() {
  return useQuery({
    queryKey: ['configOptions', 'category'],
    queryFn: () => getCategoryOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

// 失效配置缓存的 hook
export function useInvalidateConfigOptions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['configOptions'] });
}

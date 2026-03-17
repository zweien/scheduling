import type { DutyUserFiltersState } from '@/components/duty-users/types';
import type { User } from '@/types';

export function canReorderDutyUsers(filters: DutyUserFiltersState, canManage: boolean, userCount: number) {
  if (!canManage || userCount <= 1) {
    return false;
  }

  return !filters.search && !filters.organization && !filters.category && !filters.status;
}

export function reorderUserIds(userIds: number[], activeId: number, overId: number) {
  const oldIndex = userIds.indexOf(activeId);
  const newIndex = userIds.indexOf(overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return userIds;
  }

  const next = [...userIds];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

export function reorderDutyUsers(users: User[], userIds: number[]) {
  const orderMap = new Map(userIds.map((id, index) => [id, index]));

  return [...users].sort((left, right) => {
    const leftIndex = orderMap.get(left.id);
    const rightIndex = orderMap.get(right.id);

    if (leftIndex === undefined || rightIndex === undefined) {
      return left.sort_order - right.sort_order;
    }

    return leftIndex - rightIndex;
  });
}

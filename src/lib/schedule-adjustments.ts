import type { ScheduleWithUser } from '@/types';

type SetScheduleMetadata = {
  originalUserId?: number | null;
  adjustReason?: string | null;
};

type AdjustmentLogEntry = {
  action: 'move_schedule' | 'swap_schedule';
  target: string;
  oldValue: string;
  newValue: string;
  reason: string;
};

type ScheduleAdjustmentDependencies = {
  getScheduleByDate: (date: string) => ScheduleWithUser | undefined;
  setSchedule: (date: string, userId: number, isManual: boolean, metadata?: SetScheduleMetadata) => void;
  deleteSchedule: (date: string) => void;
  addLog: (entry: AdjustmentLogEntry) => void | Promise<void>;
};

type MoveInput = {
  fromDate: string;
  toDate: string;
  reason: string;
};

type SwapInput = {
  date1: string;
  date2: string;
  reason: string;
};

type AdjustmentResult =
  | { success: true }
  | { success: false; error: string };

function normalizeReason(reason: string) {
  return reason.trim();
}

function validateReason(reason: string) {
  const normalized = normalizeReason(reason);
  if (normalized.length < 10 || normalized.length > 200) {
    return null;
  }

  return normalized;
}

function resolveOriginalUserId(schedule: ScheduleWithUser) {
  return schedule.original_user_id ?? schedule.user_id;
}

export async function moveScheduleWithReason(
  input: MoveInput,
  deps: ScheduleAdjustmentDependencies
): Promise<AdjustmentResult> {
  const reason = validateReason(input.reason);
  if (!reason) {
    return { success: false, error: '请填写 10-200 字的调整理由' };
  }

  const source = deps.getScheduleByDate(input.fromDate);
  const target = deps.getScheduleByDate(input.toDate);

  if (!source) {
    return { success: false, error: '起始日期没有排班记录' };
  }

  if (target) {
    return { success: false, error: '目标日期已有排班记录' };
  }

  deps.setSchedule(input.toDate, source.user_id, true, {
    originalUserId: resolveOriginalUserId(source),
    adjustReason: reason,
  });
  deps.deleteSchedule(input.fromDate);
  await deps.addLog({
    action: 'move_schedule',
    target: `移动: ${input.fromDate} -> ${input.toDate}`,
    oldValue: `${input.fromDate}: ${source.user.name}`,
    newValue: `${input.toDate}: ${source.user.name}`,
    reason,
  });

  return { success: true };
}

export async function swapSchedulesWithReason(
  input: SwapInput,
  deps: ScheduleAdjustmentDependencies
): Promise<AdjustmentResult> {
  const reason = validateReason(input.reason);
  if (!reason) {
    return { success: false, error: '请填写 10-200 字的调整理由' };
  }

  const first = deps.getScheduleByDate(input.date1);
  const second = deps.getScheduleByDate(input.date2);

  if (!first || !second) {
    return { success: false, error: '找不到排班记录' };
  }

  deps.setSchedule(input.date1, second.user_id, true, {
    originalUserId: resolveOriginalUserId(first),
    adjustReason: reason,
  });
  deps.setSchedule(input.date2, first.user_id, true, {
    originalUserId: resolveOriginalUserId(second),
    adjustReason: reason,
  });
  await deps.addLog({
    action: 'swap_schedule',
    target: `交换: ${input.date1} <-> ${input.date2}`,
    oldValue: `${first.user.name} <-> ${second.user.name}`,
    newValue: `${second.user.name} <-> ${first.user.name}`,
    reason,
  });

  return { success: true };
}

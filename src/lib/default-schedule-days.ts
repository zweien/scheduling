import { addDays, format, parseISO } from 'date-fns';

export const DEFAULT_SCHEDULE_DAYS = 21;

export function parseDefaultScheduleDays(value: string | number | undefined | null) {
  const normalized = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(normalized) || normalized < 1) {
    return DEFAULT_SCHEDULE_DAYS;
  }

  return normalized;
}

export function resolveScheduleEndDate(startDate: string, endDate: string | undefined, defaultDays: number) {
  if (endDate) {
    return endDate;
  }

  const start = parseISO(startDate);
  return format(addDays(start, parseDefaultScheduleDays(defaultDays) - 1), 'yyyy-MM-dd');
}

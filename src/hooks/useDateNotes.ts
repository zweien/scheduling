// src/hooks/useDateNotes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDateNotesByRangeAction, saveDateNoteAction, deleteDateNoteAction } from '@/app/actions/date-notes';
import type { DateNote } from '@/lib/date-notes';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const DATE_NOTES_KEY = 'dateNotes';

function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

function getMonthRange(date: Date): { start: string; end: string } {
  const start = format(startOfMonth(date), 'yyyy-MM-dd');
  const end = format(endOfMonth(date), 'yyyy-MM-dd');
  return { start, end };
}

export function useDateNotes(month: Date) {
  const monthKey = getMonthKey(month);
  const { start, end } = getMonthRange(month);

  return useQuery({
    queryKey: [DATE_NOTES_KEY, monthKey],
    queryFn: async () => {
      const notes = await getDateNotesByRangeAction(start, end);
      return notes as DateNote[];
    },
  });
}

export function useInvalidateDateNotes() {
  const queryClient = useQueryClient();

  return async (month?: Date) => {
    if (month) {
      const monthKey = getMonthKey(month);
      await queryClient.invalidateQueries({ queryKey: [DATE_NOTES_KEY, monthKey] });
    } else {
      await queryClient.invalidateQueries({ queryKey: [DATE_NOTES_KEY] });
    }
  };
}

export function useSaveDateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, content }: { date: string; content: string }) => {
      const result = await saveDateNoteAction(date, content);
      if (!result.success) {
        throw new Error(result.error || '保存备注失败');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate all date notes queries
      queryClient.invalidateQueries({ queryKey: [DATE_NOTES_KEY] });
    },
  });
}

export function useDeleteDateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      const result = await deleteDateNoteAction(date);
      if (!result.success) {
        throw new Error(result.error || '删除备注失败');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATE_NOTES_KEY] });
    },
  });
}

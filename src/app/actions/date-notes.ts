// src/app/actions/date-notes.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { getDateNote, getDateNotesByDateRange, setDateNote, deleteDateNote } from '@/lib/date-notes';
import { revalidatePath } from 'next/cache';

export async function getDateNoteAction(date: string) {
  return getDateNote(date);
}

export async function getDateNotesByRangeAction(startDate: string, endDate: string) {
  return getDateNotesByDateRange(startDate, endDate);
}

export async function saveDateNoteAction(date: string, content: string) {
  const account = await requireAdmin();

  try {
    setDateNote(date, content);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteDateNoteAction(date: string) {
  const account = await requireAdmin();

  try {
    deleteDateNote(date);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

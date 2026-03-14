// src/app/actions/logs.ts
'use server';

import { getLogs } from '@/lib/logs';

export async function getLogList(limit: number = 100) {
  return getLogs(limit);
}

// src/app/actions/logs.ts
'use server';

import { requireAuth } from '@/lib/auth';
import { exportLogsAsCsv, exportLogsAsJson, getLogs, listLogOperators, type LogFilters } from '@/lib/logs';

export async function getLogList(filters: LogFilters = {}) {
  await requireAuth();
  return getLogs({ limit: 100, ...filters });
}

export async function getLogOperators() {
  await requireAuth();
  return listLogOperators();
}

export async function exportLogList(filters: LogFilters = {}, format: 'csv' | 'json' = 'json') {
  await requireAuth();
  const logs = getLogs(filters);
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    return {
      filename: `logs-${dateSuffix}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: exportLogsAsCsv(logs),
    };
  }

  return {
    filename: `logs-${dateSuffix}.json`,
    mimeType: 'application/json;charset=utf-8',
    content: exportLogsAsJson(logs),
  };
}

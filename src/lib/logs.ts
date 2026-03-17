// src/lib/logs.ts
import db from './db';
import { getCurrentRequestIp, extractIpAddress } from './request-context';
import type { Log, Action, AccountRole, LogSource } from '@/types';

export interface LogFilters {
  search?: string;
  action?: string;
  source?: LogSource | '';
  operatorUsername?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface LogActor {
  username?: string | null;
  role?: AccountRole | null;
}

interface LogContext {
  actor?: LogActor | null;
  ipAddress?: string | null;
  source?: LogSource | null;
  reason?: string | null;
}

function insertLog(action: Action, target: string, oldValue?: string, newValue?: string, context?: LogContext): void {
  db.prepare(`
    INSERT INTO logs (
      action,
      target,
      old_value,
      new_value,
      reason,
      operator_username,
      operator_role,
      ip_address,
      source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    action,
    target,
    oldValue ?? null,
    newValue ?? null,
    context?.reason ?? null,
    context?.actor?.username ?? null,
    context?.actor?.role ?? null,
    context?.ipAddress ?? null,
    context?.source ?? null
  );
}

function buildLogQuery(filters: LogFilters = {}) {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters.search?.trim()) {
    const searchValue = `%${filters.search.trim()}%`;
    conditions.push(`
      (
        action LIKE ?
        OR target LIKE ?
        OR COALESCE(operator_username, '') LIKE ?
        OR COALESCE(ip_address, '') LIKE ?
      )
    `);
    params.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (filters.action?.trim()) {
    conditions.push('action = ?');
    params.push(filters.action.trim());
  }

  if (filters.source?.trim()) {
    conditions.push('source = ?');
    params.push(filters.source.trim());
  }

  if (filters.operatorUsername?.trim()) {
    conditions.push('operator_username = ?');
    params.push(filters.operatorUsername.trim());
  }

  if (filters.startDate?.trim()) {
    conditions.push("DATE(created_at) >= DATE(?)");
    params.push(filters.startDate.trim());
  }

  if (filters.endDate?.trim()) {
    conditions.push("DATE(created_at) <= DATE(?)");
    params.push(filters.endDate.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = typeof filters.limit === 'number' ? 'LIMIT ?' : '';
  if (typeof filters.limit === 'number') {
    params.push(filters.limit);
  }

  return {
    sql: `
      SELECT *
      FROM logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      ${limitClause}
    `,
    params,
  };
}

function escapeCsv(value: string | null) {
  const raw = value ?? '';
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }

  return raw;
}

export function addLog(
  action: Action,
  target: string,
  oldValue?: string,
  newValue?: string,
  context?: LogContext
): void {
  insertLog(action, target, oldValue, newValue, context);
}

export async function addWebLog(
  action: Action,
  target: string,
  oldValue?: string,
  newValue?: string,
  actor?: LogActor | null,
  reason?: string
) {
  insertLog(action, target, oldValue, newValue, {
    actor,
    ipAddress: await getCurrentRequestIp(),
    source: 'web',
    reason,
  });
}

export function addApiLog(
  action: Action,
  target: string,
  oldValue: string | undefined,
  newValue: string | undefined,
  request: { headers: { get(name: string): string | null } },
  actor?: LogActor | null,
  reason?: string
) {
  insertLog(action, target, oldValue, newValue, {
    actor,
    ipAddress: extractIpAddress(request.headers),
    source: 'api',
    reason,
  });
}

export function getLogs(filters: LogFilters = {}): Log[] {
  const { sql, params } = buildLogQuery(filters);
  return db.prepare(sql).all(...params) as Log[];
}

export function listLogOperators(): string[] {
  return db.prepare(`
    SELECT DISTINCT operator_username
    FROM logs
    WHERE operator_username IS NOT NULL AND operator_username != ''
    ORDER BY operator_username ASC
  `).all().map(item => (item as { operator_username: string }).operator_username);
}

export function exportLogsAsJson(logs: Log[]) {
  return JSON.stringify(logs, null, 2);
}

export function exportLogsAsCsv(logs: Log[]) {
  const header = [
    'id',
    'action',
    'target',
    'old_value',
    'new_value',
    'reason',
    'operator_username',
    'operator_role',
    'ip_address',
    'source',
    'created_at',
  ];

  const rows = logs.map(log => [
    String(log.id),
    escapeCsv(log.action),
    escapeCsv(log.target),
    escapeCsv(log.old_value),
    escapeCsv(log.new_value),
    escapeCsv(log.reason),
    escapeCsv(log.operator_username),
    escapeCsv(log.operator_role),
    escapeCsv(log.ip_address),
    escapeCsv(log.source),
    escapeCsv(log.created_at),
  ].join(','));

  return [header.join(','), ...rows].join('\n');
}

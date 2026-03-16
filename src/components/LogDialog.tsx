'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Download, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getLogList, getLogOperators, exportLogList } from '@/app/actions/logs';
import type { Log, LogSource } from '@/types';

interface LogDialogProps {
  open: boolean;
  onClose: () => void;
}

type LogFiltersState = {
  search: string;
  action: string;
  source: LogSource | '';
  operatorUsername: string;
  startDate: string;
  endDate: string;
};

const actionConfig: Record<string, { label: string; badgeClass: string }> = {
  login: { label: '登录', badgeClass: 'bg-emerald-100 text-emerald-800' },
  logout: { label: '退出', badgeClass: 'bg-slate-100 text-slate-800' },
  register: { label: '注册', badgeClass: 'bg-sky-100 text-sky-800' },
  add_user: { label: '添加人员', badgeClass: 'bg-blue-100 text-blue-800' },
  delete_user: { label: '删除人员', badgeClass: 'bg-red-100 text-red-800' },
  delete_users: { label: '批量删除人员', badgeClass: 'bg-rose-100 text-rose-800' },
  reorder_users: { label: '调整排序', badgeClass: 'bg-indigo-100 text-indigo-800' },
  toggle_user_active: { label: '人员启停', badgeClass: 'bg-amber-100 text-amber-800' },
  generate_schedule: { label: '生成排班', badgeClass: 'bg-violet-100 text-violet-800' },
  replace_schedule: { label: '替换值班', badgeClass: 'bg-cyan-100 text-cyan-800' },
  batch_delete_schedules: { label: '批量删除排班', badgeClass: 'bg-rose-100 text-rose-800' },
  swap_schedule: { label: '交换值班', badgeClass: 'bg-fuchsia-100 text-fuchsia-800' },
  set_password: { label: '修改密码', badgeClass: 'bg-slate-100 text-slate-800' },
  add_account: { label: '创建账号', badgeClass: 'bg-blue-100 text-blue-800' },
  toggle_account_active: { label: '账号启停', badgeClass: 'bg-amber-100 text-amber-800' },
  change_account_role: { label: '变更角色', badgeClass: 'bg-indigo-100 text-indigo-800' },
  toggle_registration: { label: '注册开关', badgeClass: 'bg-orange-100 text-orange-800' },
  create_token: { label: '创建 Token', badgeClass: 'bg-emerald-100 text-emerald-800' },
  disable_token: { label: '禁用 Token', badgeClass: 'bg-rose-100 text-rose-800' },
};

const actionOptions = Object.entries(actionConfig).map(([value, config]) => ({
  value,
  label: config.label,
}));

const emptyFilters: LogFiltersState = {
  search: '',
  action: '',
  source: '',
  operatorUsername: '',
  startDate: '',
  endDate: '',
};

function SourceBadge({ source }: { source: LogSource | null }) {
  if (!source) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">未知</span>;
  }

  const config = {
    web: { label: 'WEB', className: 'bg-blue-100 text-blue-800' },
    api: { label: 'API', className: 'bg-emerald-100 text-emerald-800' },
    system: { label: 'SYSTEM', className: 'bg-slate-100 text-slate-800' },
  }[source];

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function createDownloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LogContent({ active = true }: { active?: boolean }) {
  const [filters, setFilters] = useState<LogFiltersState>(emptyFilters);
  const [logs, setLogs] = useState<Log[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [loading, startTransition] = useTransition();
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  function updateFilter<K extends keyof LogFiltersState>(key: K, value: LogFiltersState[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  async function loadLogs(nextFilters: LogFiltersState) {
    const [logItems, operatorItems] = await Promise.all([
      getLogList(nextFilters),
      getLogOperators(),
    ]);
    setLogs(logItems);
    setOperators(operatorItems);
  }

  useEffect(() => {
    if (!active) {
      return;
    }

    startTransition(() => {
      queueMicrotask(() => {
        void loadLogs(filters);
      });
    });
  }, [active, filters]);

  const totalCount = logs.length;

  const tableRows = useMemo(() => logs.map(log => {
    const config = actionConfig[log.action] ?? {
      label: log.action,
      badgeClass: 'bg-slate-100 text-slate-800',
    };

    return {
      ...log,
      actionLabel: config.label,
      actionBadgeClass: config.badgeClass,
      createdAtLabel: format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
    };
  }), [logs]);

  async function handleExport(format: 'csv' | 'json') {
    setExporting(format);
    try {
      const result = await exportLogList(filters, format);
      createDownloadBlob(result.content, result.mimeType, result.filename);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm font-medium" htmlFor="log-search">搜索</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="log-search"
                placeholder="搜索操作类型、对象、用户或 IP"
                value={filters.search}
                onChange={event => updateFilter('search', event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="log-action">操作类型</label>
            <select
              id="log-action"
              aria-label="操作类型"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={filters.action}
              onChange={event => updateFilter('action', event.target.value)}
            >
              <option value="">全部操作</option>
              {actionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="log-source">来源</label>
            <select
              id="log-source"
              aria-label="来源"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={filters.source}
              onChange={event => updateFilter('source', event.target.value as LogSource | '')}
            >
              <option value="">全部来源</option>
              <option value="web">WEB</option>
              <option value="api">API</option>
              <option value="system">SYSTEM</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="log-operator">操作用户</label>
            <select
              id="log-operator"
              aria-label="操作用户"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={filters.operatorUsername}
              onChange={event => updateFilter('operatorUsername', event.target.value)}
            >
              <option value="">全部用户</option>
              {operators.map(operator => (
                <option key={operator} value={operator}>{operator}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="log-start-date">开始日期</label>
            <Input
              id="log-start-date"
              type="date"
              value={filters.startDate}
              onChange={event => updateFilter('startDate', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="log-end-date">结束日期</label>
            <Input
              id="log-end-date"
              type="date"
              value={filters.endDate}
              onChange={event => updateFilter('endDate', event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => setFilters(emptyFilters)}>
              重置筛选
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            共 {totalCount} 条记录
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void handleExport('json')} disabled={exporting !== null}>
              <Download className="mr-1 h-4 w-4" />
              导出 JSON
            </Button>
            <Button variant="outline" onClick={() => void handleExport('csv')} disabled={exporting !== null}>
              <Download className="mr-1 h-4 w-4" />
              导出 CSV
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[180px_140px_1fr_160px_140px_160px_100px] gap-3 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
          <div>时间</div>
          <div>操作类型</div>
          <div>操作对象</div>
          <div>旧值 / 新值</div>
          <div>操作用户</div>
          <div>IP 地址</div>
          <div>来源</div>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          {tableRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {loading ? '正在加载日志...' : '当前筛选条件下暂无日志记录'}
            </div>
          ) : (
            tableRows.map(log => (
              <div
                key={log.id}
                className="grid grid-cols-[180px_140px_1fr_160px_140px_160px_100px] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
              >
                <div className="text-muted-foreground">{log.createdAtLabel}</div>
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.actionBadgeClass}`}>
                    {log.actionLabel}
                  </span>
                </div>
                <div className="min-w-0 break-all">{log.target}</div>
                <div className="space-y-1 text-xs">
                  <div><span className="text-muted-foreground">旧：</span>{log.old_value ?? '-'}</div>
                  <div><span className="text-muted-foreground">新：</span>{log.new_value ?? '-'}</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-medium">{log.operator_username ?? '-'}</div>
                  <div className="text-muted-foreground">{log.operator_role ?? '-'}</div>
                </div>
                <div className="break-all text-xs">{log.ip_address ?? '-'}</div>
                <div>
                  <SourceBadge source={log.source} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function LogDialog({ open, onClose }: LogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>操作日志</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          <LogContent active={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

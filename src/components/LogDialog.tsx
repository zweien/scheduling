// src/components/LogDialog.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLogList } from '@/app/actions/logs';
import type { Log } from '@/types';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface LogDialogProps {
  open: boolean;
  onClose: () => void;
}

const actionConfig: Record<string, { label: string; colorClass: string }> = {
  login: { label: '登录', colorClass: 'text-success' },
  logout: { label: '退出', colorClass: 'text-success' },
  add_user: { label: '添加人员', colorClass: 'text-primary' },
  delete_user: { label: '删除人员', colorClass: 'text-destructive' },
  reorder_users: { label: '调整排序', colorClass: 'text-primary' },
  generate_schedule: { label: '生成排班', colorClass: 'text-primary' },
  replace_schedule: { label: '替换值班', colorClass: 'text-primary' },
  swap_schedule: { label: '交换值班', colorClass: 'text-primary' },
  set_password: { label: '修改密码', colorClass: 'text-primary' },
};

export function LogDialog({ open, onClose }: LogDialogProps) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (open) {
      getLogList().then(setLogs);
    }
  }, [open]);

  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: Log[] }[] = [
      { label: '今天', logs: [] },
      { label: '昨天', logs: [] },
      { label: '更早', logs: [] },
    ];

    logs.forEach(log => {
      const logDate = parseISO(log.created_at);
      if (isToday(logDate)) {
        groups[0].logs.push(log);
      } else if (isYesterday(logDate)) {
        groups[1].logs.push(log);
      } else {
        groups[2].logs.push(log);
      }
    });

    return groups.filter(g => g.logs.length > 0);
  }, [logs]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>操作日志</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <div className="border-2 border-dashed rounded-lg p-6">
                暂无操作记录
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedLogs.map(group => (
                <div key={group.label}>
                  <div className="text-xs font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1 z-10">
                    {group.label}
                  </div>

                  {/* 时间线 */}
                  <div className="relative pl-6 space-y-4">
                    {/* 竖线 */}
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

                    {group.logs.map(log => {
                      const config = actionConfig[log.action] || { label: log.action, colorClass: 'text-primary' };
                      return (
                        <div key={log.id} className="relative">
                          {/* 圆点 */}
                          <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

                          <div className="border rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-start gap-2">
                              <div className={`font-medium ${config.colorClass}`}>
                                {config.label}
                              </div>
                              <div className="text-muted-foreground text-xs shrink-0">
                                {format(parseISO(log.created_at), 'HH:mm', { locale: zhCN })}
                              </div>
                            </div>
                            <div className="mt-1 text-foreground">{log.target}</div>
                            {log.old_value && log.new_value && (
                              <div className="mt-2 bg-muted/50 p-2 rounded text-xs space-y-1">
                                <div><span className="text-destructive">旧值：</span>{log.old_value}</div>
                                <div><span className="text-success">新值：</span>{log.new_value}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// src/components/LogDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLogList } from '@/app/actions/logs';
import type { Log } from '@/types';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface LogDialogProps {
  open: boolean;
  onClose: () => void;
}

const actionLabels: Record<string, string> = {
  login: '登录',
  logout: '退出',
  add_user: '添加人员',
  delete_user: '删除人员',
  reorder_users: '调整排序',
  generate_schedule: '生成排班',
  replace_schedule: '替换值班',
  swap_schedule: '交换值班',
  set_password: '修改密码',
};

export function LogDialog({ open, onClose }: LogDialogProps) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (open) {
      getLogList().then(setLogs);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>操作日志</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-10">暂无日志记录</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="border rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-blue-600">
                      {actionLabels[log.action] || log.action}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {format(parseISO(log.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                    </div>
                  </div>
                  <div className="mt-1 text-gray-600">{log.target}</div>
                  {log.old_value && log.new_value && (
                    <div className="mt-2 bg-gray-50 p-2 rounded text-xs space-y-1">
                      <div><span className="text-red-500">旧值：</span>{log.old_value}</div>
                      <div><span className="text-green-500">新值：</span>{log.new_value}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

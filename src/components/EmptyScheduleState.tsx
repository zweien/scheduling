'use client';

import { Button } from '@/components/ui/button';

interface EmptyScheduleStateProps {
  title?: string;
  description?: string;
  canManage: boolean;
  onRequestGenerate?: () => void;
}

export function EmptyScheduleState({
  title = '当前月份还没有排班',
  description = '可以先生成排班，也可以导入已有值班表',
  canManage,
  onRequestGenerate,
}: EmptyScheduleStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/80 px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-lg font-semibold">排班</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {canManage ? (
            <p className="text-xs text-muted-foreground">也可以通过导入排班快速录入已有值班表</p>
          ) : (
            <p className="text-xs text-muted-foreground">当前账号只有查看权限，如需生成或导入排班请联系管理员</p>
          )}
        </div>

        {canManage && onRequestGenerate ? (
          <Button onClick={onRequestGenerate}>
            去生成排班
          </Button>
        ) : null}
      </div>
    </div>
  );
}

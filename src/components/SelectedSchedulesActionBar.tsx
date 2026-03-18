'use client';

import { Button } from '@/components/ui/button';

interface SelectedSchedulesActionBarProps {
  selectedCount: number;
  onBatchEdit: () => void;
  onExportSelected: () => void;
  onBatchDelete: () => void;
}

export function SelectedSchedulesActionBar({
  selectedCount,
  onBatchEdit,
  onExportSelected,
  onBatchDelete,
}: SelectedSchedulesActionBarProps) {
  return (
    <div
      data-testid="selected-schedules-action-bar"
      className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-foreground">
          已选择 {selectedCount} 天
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <Button variant="outline" size="sm" onClick={onBatchEdit}>
            批量编辑
          </Button>
          <Button variant="outline" size="sm" onClick={onExportSelected}>
            导出已选
          </Button>
          <Button variant="destructive" size="sm" onClick={onBatchDelete}>
            批量删除
          </Button>
        </div>
      </div>
    </div>
  );
}

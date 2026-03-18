'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AutoScheduleStartMode } from '@/types';

interface AutoScheduleDialogProps {
  open: boolean;
  startDate: string;
  defaultDays: number;
  onClose: () => void;
  onConfirm?: (input: { days: number; startMode: AutoScheduleStartMode }) => Promise<void> | void;
}

export function AutoScheduleDialog({
  open,
  startDate,
  defaultDays,
  onClose,
  onConfirm,
}: AutoScheduleDialogProps) {
  const [days, setDays] = useState(String(defaultDays));
  const [startMode, setStartMode] = useState<AutoScheduleStartMode>('continue');

  async function handleConfirm() {
    const normalizedDays = Number.parseInt(days, 10);
    if (!Number.isFinite(normalizedDays) || normalizedDays < 1) {
      return;
    }

    await onConfirm?.({
      days: normalizedDays,
      startMode,
    });
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>自动排班</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">起始日期</div>
            <div className="rounded border border-border bg-muted/30 px-3 py-2 text-sm">{startDate}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="auto-schedule-days">连续天数</label>
            <Input
              id="auto-schedule-days"
              aria-label="连续天数"
              type="number"
              min={1}
              value={days}
              onChange={event => setDays(event.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">排班起点</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="auto-schedule-start-mode"
                checked={startMode === 'continue'}
                onChange={() => setStartMode('continue')}
                aria-label="延续现有排班（推荐）"
              />
              <span>延续现有排班（推荐）</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="auto-schedule-start-mode"
                checked={startMode === 'from_first'}
                onChange={() => setStartMode('from_first')}
                aria-label="从首位人员开始"
              />
              <span>从首位人员开始</span>
            </label>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={() => void handleConfirm()}>
              确认自动排班
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

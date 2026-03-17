'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AdjustmentType = 'move' | 'swap';

interface ScheduleAdjustmentReasonDialogProps {
  open: boolean;
  actionType: AdjustmentType;
  sourceDate: string;
  targetDate: string;
  sourceUserName: string;
  targetUserName?: string | null;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

export function ScheduleAdjustmentReasonDialog({
  open,
  actionType,
  sourceDate,
  targetDate,
  sourceUserName,
  targetUserName,
  onConfirm,
  onClose,
}: ScheduleAdjustmentReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = actionType === 'move' ? '确认移动排班' : '确认交换排班';

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (trimmed.length < 10 || trimmed.length > 200) {
      setError('请填写 10-200 字的调整理由');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onConfirm(trimmed);
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : '提交调整理由失败');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (!nextOpen && !submitting) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            请填写本次拖拽调整的原因，确认后才会保存变更。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div>来源日期：{sourceDate}</div>
            <div>目标日期：{targetDate}</div>
            <div>
              {actionType === 'move' ? '移动人员：' : '涉及人员：'}
              {sourceUserName}
              {targetUserName ? `、${targetUserName}` : ''}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-adjustment-reason">调整理由</Label>
            <textarea
              id="schedule-adjustment-reason"
              value={reason}
              aria-label="调整理由"
              placeholder="请填写本次换班或移动的原因"
              onChange={event => {
                setReason(event.target.value);
                if (error) {
                  setError('');
                }
              }}
              className={cn(
                'flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                error ? 'border-destructive ring-3 ring-destructive/20' : ''
              )}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{error || '请输入 10-200 字的调整原因'}</span>
              <span>{reason.trim().length}/200</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={submitting}>
            确认调整
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// src/components/LeaderSelectDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Leader } from '@/types';

interface LeaderSelectDialogProps {
  open: boolean;
  leaders: Leader[];
  onSelect: (leaderId: number) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  onClose: () => void;
}

export function LeaderSelectDialog({
  open,
  leaders,
  onSelect,
  onDelete,
  canDelete = false,
  onClose,
}: LeaderSelectDialogProps) {
  const [keyword, setKeyword] = useState('');

  const trimmedKeyword = keyword.trim();
  const filteredLeaders = trimmedKeyword
    ? leaders.filter(leader => leader.name.includes(trimmedKeyword))
    : leaders;

  // 只显示启用的领导
  const activeLeaders = filteredLeaders.filter(leader => leader.is_active);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setKeyword('');
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>选择值班领导</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              value={keyword}
              placeholder="搜索姓名"
              aria-label="搜索姓名"
              onChange={event => setKeyword(event.target.value)}
            />
          </div>

          {activeLeaders.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activeLeaders.map(leader => (
                <Button
                  key={leader.id}
                  variant="outline"
                  onClick={() => onSelect(leader.id)}
                  className="justify-start"
                >
                  {leader.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {leaders.length === 0 ? '请先添加值班领导' : '没有匹配的值班领导'}
            </div>
          )}
        </div>
        {canDelete && onDelete ? (
          <div className="space-y-2 border-t pt-4">
            <Button
              variant="destructive"
              onClick={onDelete}
              className="w-full"
            >
              恢复为默认领导
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

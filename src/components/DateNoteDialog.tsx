// src/components/DateNoteDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveDateNote, useDeleteDateNote } from '@/hooks/useDateNotes';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { StickyNote, Trash2 } from 'lucide-react';

interface DateNoteDialogProps {
  open: boolean;
  date: string | null;
  initialContent?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DateNoteDialog({
  open,
  date,
  initialContent = '',
  onClose,
  onSuccess,
}: DateNoteDialogProps) {
  const [content, setContent] = useState(initialContent);
  const saveMutation = useSaveDateNote();
  const deleteMutation = useDeleteDateNote();

  useEffect(() => {
    if (open) {
      setContent(initialContent);
    }
  }, [open, initialContent]);

  const handleSave = async () => {
    if (!date) return;

    try {
      await saveMutation.mutateAsync({ date, content: content.trim() });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!date) return;

    const confirmed = window.confirm('确定要删除该日期的备注吗？');
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(date);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const formattedDate = date
    ? format(parseISO(date), 'yyyy年M月d日', { locale: zhCN })
    : '';

  const isLoading = saveMutation.isPending || deleteMutation.isPending;
  const isEmpty = !content.trim();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            日期备注
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            {formattedDate}
          </div>

          <Textarea
            placeholder="请输入备注内容..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="resize-none"
            disabled={isLoading}
          />

          <div className="text-xs text-muted-foreground">
            提示：备注内容支持多行文本，保存后会在日历中显示备注标识
          </div>
        </div>

        <DialogFooter className="gap-2">
          {initialContent && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="gap-1"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isEmpty}
            className="gap-1"
          >
            <StickyNote className="w-4 h-4" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

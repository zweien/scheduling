'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConfigOption } from '@/types';

interface ConfigOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOption: ConfigOption | null;
  typeLabel: string;
  onSave: (value: string, label: string) => Promise<void>;
  loading: boolean;
}

export function ConfigOptionDialog({
  open,
  onOpenChange,
  editingOption,
  typeLabel,
  onSave,
  loading,
}: ConfigOptionDialogProps) {
  // 使用 key 重置状态的方式，避免在 useEffect 中设置状态
  const [value, setValue] = useState(editingOption?.value ?? '');
  const [label, setLabel] = useState(editingOption?.label ?? '');
  const [error, setError] = useState<string | null>(null);

  // 当弹窗打开时重置表单
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // 弹窗打开时重置表单
      setValue(editingOption?.value ?? '');
      setLabel(editingOption?.label ?? '');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedValue = value.trim();
    const trimmedLabel = label.trim();

    if (!trimmedValue) {
      setError('请输入值');
      return;
    }
    if (!trimmedLabel) {
      setError('请输入显示名称');
      return;
    }

    try {
      await onSave(trimmedValue, trimmedLabel);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || '保存失败');
    }
  };

  const title = editingOption ? `编辑${typeLabel}` : `新增${typeLabel}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">值</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="用于存储的标识符"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">显示名称</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="在界面上显示的名称"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

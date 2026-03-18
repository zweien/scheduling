'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { adminUpdateAccountPasswordAction } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Account } from '@/types';

interface AdminAccountPasswordDialogProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
}

export function AdminAccountPasswordDialog({ account, open, onClose }: AdminAccountPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!account) {
      setError('账号不存在');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await adminUpdateAccountPasswordAction(account.id, newPassword);
      if (!result.success) {
        setError(result.error ?? '修改失败');
        return;
      }

      toast.success('密码修改成功');
      handleClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (!nextOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>修改成员密码</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
            <div className="font-medium">{account?.display_name ?? '未知账号'}</div>
            <div className="text-muted-foreground">{account?.username ?? '-'}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-account-new-password">新密码</Label>
            <Input
              id="admin-account-new-password"
              aria-label="新密码"
              type="password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              placeholder="至少 6 位"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-account-confirm-password">确认新密码</Label>
            <Input
              id="admin-account-confirm-password"
              aria-label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="再次输入新密码"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '修改中...' : '确认修改'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// src/components/PasswordDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePasswordAction } from '@/app/actions/config';

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordDialog({ open, onClose }: PasswordDialogProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    setLoading(true);
    const result = await updatePasswordAction(oldPassword, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError(result.error ?? '修改失败');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
          )}
          {success && (
            <div className="text-sm text-green-500 bg-green-50 p-2 rounded">密码修改成功！</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="oldPassword">原密码</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="请输入原密码"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="请输入新密码"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading}>
              {loading ? '修改中...' : '确认修改'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

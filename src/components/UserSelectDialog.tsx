// src/components/UserSelectDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User } from '@/types';

interface UserSelectDialogProps {
  open: boolean;
  users: User[];
  onSelect: (userId: number) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  onClose: () => void;
}

export function UserSelectDialog({
  open,
  users,
  onSelect,
  onDelete,
  canDelete = false,
  onClose,
}: UserSelectDialogProps) {
  const [keyword, setKeyword] = useState('');

  const trimmedKeyword = keyword.trim();
  const filteredUsers = trimmedKeyword
    ? users.filter(user => user.name.includes(trimmedKeyword))
    : users;

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
          <DialogTitle>选择值班人员</DialogTitle>
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

          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredUsers.map(user => (
                <Button
                  key={user.id}
                  variant="outline"
                  onClick={() => onSelect(user.id)}
                  className="justify-start"
                >
                  {user.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              没有匹配的值班人员
            </div>
          )}
        </div>
        {canDelete && onDelete ? (
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              onClick={onDelete}
              className="w-full"
            >
              删除当天值班
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

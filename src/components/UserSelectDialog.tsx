// src/components/UserSelectDialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>选择值班人员</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-4">
          {users.map(user => (
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

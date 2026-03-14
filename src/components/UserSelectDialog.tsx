// src/components/UserSelectDialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface UserSelectDialogProps {
  open: boolean;
  users: User[];
  onSelect: (userId: number) => void;
  onClose: () => void;
}

export function UserSelectDialog({ open, users, onSelect, onClose }: UserSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>选择值班人员</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
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
      </DialogContent>
    </Dialog>
  );
}

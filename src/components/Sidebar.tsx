// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserList } from '@/components/UserList';
import { ScheduleGenerator } from '@/components/ScheduleGenerator';

interface SidebarProps {
  isOpen: boolean;
  onScheduleGenerated: () => void;
}

export function Sidebar({ isOpen, onScheduleGenerated }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r bg-white p-4 space-y-4 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人员管理</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成排班</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleGenerator onGenerated={onScheduleGenerated} />
        </CardContent>
      </Card>
    </aside>
  );
}

// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <CardContent className="space-y-2">
          <div className="text-sm text-gray-500">加载中...</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成排班</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-gray-500">加载中...</div>
        </CardContent>
      </Card>
    </aside>
  );
}

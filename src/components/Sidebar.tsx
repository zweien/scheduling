// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserList } from '@/components/UserList';
import { ScheduleGenerator } from '@/components/ScheduleGenerator';

interface SidebarProps {
  isOpen: boolean;
  onScheduleGenerated: () => void;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onScheduleGenerated, onClose }: SidebarProps) {
  return (
    <>
      {/* 移动端：抽屉式侧边栏 */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-background border-r transform transition-transform duration-300
          lg:relative
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 space-y-4 overflow-y-auto h-full">
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
        </div>
      </div>

      {/* 移动端：遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}

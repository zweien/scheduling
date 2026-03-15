// src/components/Sidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleGenerator } from '@/components/ScheduleGenerator';
import { CalendarPlus } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onScheduleGenerated: () => void;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onScheduleGenerated, onClose }: SidebarProps) {
  return (
    <>
      {/* 侧边栏 */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-background border-r
          transform transition-transform duration-300 ease-out
          lg:relative
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary" />
                生成排班
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleGenerator onGenerated={onScheduleGenerated} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 移动端遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
    </>
  );
}

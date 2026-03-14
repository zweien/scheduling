// src/components/Header.tsx
'use client';

import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';

type ViewMode = 'calendar' | 'list';

interface HeaderProps {
  onToggleSidebar: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShowStats: () => void;
  onShowLogs: () => void;
  onShowPassword: () => void;
}

export function Header({ onToggleSidebar, viewMode, onViewModeChange, onShowStats, onShowLogs, onShowPassword }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden">
          ☰
        </Button>
        <h1 className="text-lg font-semibold">值班排班系统</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex border rounded overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none"
          >
            月历
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-none"
          >
            列表
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={onShowStats}>统计</Button>
        <Button variant="outline" size="sm" onClick={onShowLogs}>日志</Button>
        <Button variant="outline" size="sm" onClick={onShowPassword}>改密</Button>

        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">退出</Button>
        </form>
      </div>
    </header>
  );
}

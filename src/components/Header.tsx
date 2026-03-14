// src/components/Header.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './ThemeToggle';

type ViewMode = 'calendar' | 'list';

interface HeaderProps {
  onToggleSidebar: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShowStats: () => void;
  onShowLogs: () => void;
  onShowPassword: () => void;
  onShowPrint: () => void;
  onShowExport: () => void;
}

export function Header({
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  onShowStats,
  onShowLogs,
  onShowPassword,
  onShowPrint,
  onShowExport
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
          ☰
        </Button>
        <h1 className="text-base sm:text-lg font-semibold truncate">值班排班系统</h1>
      </div>

      {/* 桌面端：显示所有按钮 */}
      <div className="hidden md:flex items-center gap-2">
        <ThemeToggle />
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
        <Button variant="outline" size="sm" onClick={onShowPrint}>打印</Button>
        <Button variant="outline" size="sm" onClick={onShowExport}>导出</Button>
        <Button variant="outline" size="sm" onClick={onShowPassword}>改密</Button>

        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">退出</Button>
        </form>
      </div>

      {/* 移动端：紧凑布局 */}
      <div className="flex md:hidden items-center gap-1">
        <ThemeToggle />
        <div className="flex border rounded overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none px-2"
          >
            月历
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-none px-2"
          >
            列表
          </Button>
        </div>

        {/* 更多菜单 */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ▼
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-background border rounded shadow-lg z-50">
              <button
                onClick={() => { onShowStats(); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                统计
              </button>
              <button
                onClick={() => { onShowLogs(); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                日志
              </button>
              <button
                onClick={() => { onShowPrint(); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                打印
              </button>
              <button
                onClick={() => { onShowExport(); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                导出
              </button>
              <button
                onClick={() => { onShowPassword(); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
              >
                改密
              </button>
              <hr />
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted text-red-500"
                >
                  退出
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

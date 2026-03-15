// src/components/Header.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link';
import {
  Menu,
  BarChart3,
  History,
  Printer,
  Download,
  Key,
  LogOut,
  Calendar,
  List,
  MoreVertical,
  X,
} from 'lucide-react';

type ViewMode = 'calendar' | 'list';

interface HeaderProps {
  onToggleSidebar: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShowLogs: () => void;
  onShowPassword: () => void;
  onShowPrint: () => void;
  onShowExport: () => void;
}

export function Header({
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  onShowLogs,
  onShowPassword,
  onShowPrint,
  onShowExport,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    { label: '日志', icon: History, onClick: onShowLogs },
    { label: '打印', icon: Printer, onClick: onShowPrint },
    { label: '导出', icon: Download, onClick: onShowExport },
    { label: '改密', icon: Key, onClick: onShowPassword },
  ];

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
      {/* 品牌区 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8">
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-base sm:text-lg font-semibold truncate">值班排班系统</h1>
      </div>

      {/* 桌面端：视图切换 + 操作区 */}
      <div className="hidden md:flex items-center gap-3">
        {/* 主题切换 */}
        <ThemeToggle />

        {/* 视图切换 */}
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none gap-1"
          >
            <Calendar className="w-4 h-4" />
            月历
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-none gap-1"
          >
            <List className="w-4 h-4" />
            列表
          </Button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-border" />

        {/* 操作按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/statistics')}
          className="gap-1.5"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden lg:inline">统计</span>
        </Button>
        {menuItems.map(item => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            onClick={item.onClick}
            className="gap-1.5"
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden lg:inline">{item.label}</span>
          </Button>
        ))}

        {/* 退出 */}
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-destructive hover:text-destructive">
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">退出</span>
          </Button>
        </form>
      </div>

      {/* 移动端：紧凑布局 */}
      <div className="flex md:hidden items-center gap-1">
        <ThemeToggle />

        {/* 视图切换 */}
        <div className="flex border rounded overflow-hidden">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('calendar')}
            className="rounded-none h-8 w-8"
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('list')}
            className="rounded-none h-8 w-8"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* 更多菜单 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
          </Button>

          {/* Action Sheet 风格菜单 */}
          {menuOpen && (
            <>
              {/* 遮罩 */}
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setMenuOpen(false)}
              />

              {/* 菜单面板 */}
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl p-4 z-50 animate-fade-in">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <button
                    onClick={() => { router.push('/dashboard/statistics'); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <BarChart3 className="w-6 h-6 text-primary" />
                    <span className="text-sm">统计</span>
                </button>
                  {menuItems.map(item => (
                    <button
                      key={item.label}
                      onClick={() => { item.onClick(); setMenuOpen(false); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <item.icon className="w-6 h-6 text-primary" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>

                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors"
                  >
                    退出登录
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

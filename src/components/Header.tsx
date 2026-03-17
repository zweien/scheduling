// src/components/Header.tsx
'use client';

import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './ThemeToggle';
import { useDashboardAccount } from './DashboardAccountProvider';
import { getAppVersion } from '@/lib/app-version';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  BarChart3,
  History,
  Printer,
  Download,
  Building2,
  LogOut,
  Calendar,
  List,
  MoreVertical,
  X,
  LayoutGrid,
  LockKeyhole,
  Settings,
} from 'lucide-react';

type ViewMode = 'calendar' | 'list';

interface HeaderProps {
  onToggleSidebar?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  currentSection?: string;
}

export function Header({
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  currentSection = '排班',
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { role } = useDashboardAccount();
  const appVersion = getAppVersion();
  const showViewToggle = pathname === '/dashboard' && viewMode && onViewModeChange;

  const navItems = [
    { label: '排班', href: '/dashboard', icon: LayoutGrid, match: (path: string) => path === '/dashboard' },
    { label: '统计', href: '/dashboard/statistics', icon: BarChart3, match: (path: string) => path.startsWith('/dashboard/statistics') },
    { label: '值班人员', href: '/dashboard/users', icon: Building2, match: (path: string) => path.startsWith('/dashboard/users') },
    { label: '日志', href: '/dashboard/logs', icon: History, match: (path: string) => path.startsWith('/dashboard/logs') },
    { label: '打印', href: '/dashboard/print', icon: Printer, match: (path: string) => path.startsWith('/dashboard/print') },
    { label: '导出', href: '/dashboard/export', icon: Download, match: (path: string) => path.startsWith('/dashboard/export') },
    ...(role === 'admin'
      ? [{ label: '账号管理', href: '/dashboard/accounts', icon: LockKeyhole, match: (path: string) => path.startsWith('/dashboard/accounts') }]
      : []),
    { label: '设置', href: '/dashboard/settings', icon: Settings, match: (path: string) => path.startsWith('/dashboard/settings') },
  ];

  return (
    <header className="min-h-16 sm:min-h-[72px] border-b bg-background flex items-center justify-between px-4 py-2 gap-4">
      {/* 品牌区 */}
      <div className="flex items-center gap-3">
        {onToggleSidebar ? (
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8">
            <Menu className="w-5 h-5" />
          </Button>
        ) : (
          <div className="w-8" />
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">值班排班系统</h1>
          <p className="text-[11px] leading-4 text-muted-foreground">版本 {appVersion}</p>
          <p className="hidden sm:block text-xs text-muted-foreground">{currentSection}</p>
        </div>
      </div>

      {/* 桌面端：视图切换 + 操作区 */}
      <div className="hidden md:flex items-center gap-3">
        {/* 主题切换 */}
        <ThemeToggle />

        {/* 视图切换 */}
        {showViewToggle ? (
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
        ) : null}

        {/* 分隔线 */}
        <div className="w-px h-6 bg-border" />

        {/* 操作按钮 */}
        {navItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={buttonVariants({
              variant: item.match(pathname) ? 'default' : 'ghost',
              size: 'sm',
              className: 'gap-1.5',
            })}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
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
        {showViewToggle ? (
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
        ) : null}

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
                  {navItems.map(item => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <item.icon className="w-6 h-6 text-primary" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
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

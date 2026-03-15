'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';
import type { AccountRole } from '@/types';

type ViewMode = 'calendar' | 'list';

interface DashboardHomeClientProps {
  role: AccountRole;
}

export function DashboardHomeClient({ role }: DashboardHomeClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  const canManage = role === 'admin';

  const handleScheduleGenerated = () => {
    setRefreshKey(key => key + 1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={canManage ? () => setSidebarOpen(!sidebarOpen) : undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentSection="排班"
      />

      <div className="flex-1 flex overflow-hidden relative">
        {canManage ? (
          <Sidebar
            isOpen={sidebarOpen}
            onScheduleGenerated={handleScheduleGenerated}
            onClose={() => setSidebarOpen(false)}
          />
        ) : null}

        <main className="flex-1 p-4 bg-muted/30 overflow-y-auto">
          {viewMode === 'calendar' ? (
            <CalendarView refreshKey={refreshKey} canManage={canManage} />
          ) : (
            <ListView refreshKey={refreshKey} canManage={canManage} />
          )}
        </main>
      </div>
    </div>
  );
}

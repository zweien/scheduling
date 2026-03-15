// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';

type ViewMode = 'calendar' | 'list';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScheduleGenerated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentSection="排班"
      />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          isOpen={sidebarOpen}
          onScheduleGenerated={handleScheduleGenerated}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-4 bg-muted/30 overflow-y-auto">
          {viewMode === 'calendar' ? (
            <CalendarView refreshKey={refreshKey} />
          ) : (
            <ListView refreshKey={refreshKey} />
          )}
        </main>
      </div>
    </div>
  );
}

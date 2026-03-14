// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';
import { StatisticsDialog } from '@/components/StatisticsDialog';
import { LogDialog } from '@/components/LogDialog';
import { PasswordDialog } from '@/components/PasswordDialog';
import { PrintDialog } from '@/components/PrintDialog';
import { ExportDialog } from '@/components/ExportDialog';

type ViewMode = 'calendar' | 'list';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleScheduleGenerated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onShowStats={() => setStatsOpen(true)}
        onShowLogs={() => setLogsOpen(true)}
        onShowPassword={() => setPasswordOpen(true)}
        onShowPrint={() => setPrintOpen(true)}
        onShowExport={() => setExportOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onScheduleGenerated={handleScheduleGenerated} />
        <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          {viewMode === 'calendar' ? (
            <CalendarView refreshKey={refreshKey} />
          ) : (
            <ListView refreshKey={refreshKey} />
          )}
        </main>
      </div>

      <StatisticsDialog open={statsOpen} onClose={() => setStatsOpen(false)} />
      <LogDialog open={logsOpen} onClose={() => setLogsOpen(false)} />
      <PasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <PrintDialog open={printOpen} onClose={() => setPrintOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

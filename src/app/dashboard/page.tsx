// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';
import { LogDialog } from '@/components/LogDialog';
import { PasswordDialog } from '@/components/PasswordDialog';
import { PrintDialog } from '@/components/PrintDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { TokenDialog } from '@/components/TokenDialog';

type ViewMode = 'calendar' | 'list';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  const [logsOpen, setLogsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);

  const handleScheduleGenerated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onShowLogs={() => setLogsOpen(true)}
        onShowPassword={() => setPasswordOpen(true)}
        onShowPrint={() => setPrintOpen(true)}
        onShowExport={() => setExportOpen(true)}
        onShowTokens={() => setTokenOpen(true)}
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

      <LogDialog open={logsOpen} onClose={() => setLogsOpen(false)} />
      <PasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <PrintDialog open={printOpen} onClose={() => setPrintOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <TokenDialog open={tokenOpen} onClose={() => setTokenOpen(false)} />
    </div>
  );
}

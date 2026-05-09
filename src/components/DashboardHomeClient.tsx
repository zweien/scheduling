'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';
import { Button } from '@/components/ui/button';
import { ScheduleImportDialog } from '@/components/ScheduleImportDialog';
import { backfillLeaderSchedulesAction } from '@/app/actions/schedule';
import { toast } from 'sonner';
import type { AccountRole } from '@/types';

type ViewMode = 'calendar' | 'list';

interface DashboardHomeClientProps {
  role: AccountRole;
}

export function DashboardHomeClient({ role }: DashboardHomeClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const canManage = role === 'admin';

  const handleScheduleGenerated = () => {
    setRefreshKey(key => key + 1);
  };

  const handleBackfillLeaderSchedules = async () => {
    setBackfilling(true);
    try {
      const result = await backfillLeaderSchedulesAction();
      if (result.success) {
        toast.success(`已补全 ${result.filledCount} 条值班领导排班`);
        if (result.filledCount! > 0) {
          handleScheduleGenerated();
        }
      } else {
        toast.error(result.error ?? '补全失败');
      }
    } catch {
      toast.error('补全失败');
    } finally {
      setBackfilling(false);
    }
  };

  const handleOpenScheduleGenerator = () => {
    setSidebarOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById('startDate')?.focus();
    });
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
          {canManage ? (
            <div className="mb-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleBackfillLeaderSchedules} disabled={backfilling}>
                {backfilling ? '补全中...' : '补全值班领导'}
              </Button>
              <Button onClick={() => setImportOpen(true)}>导入排班</Button>
            </div>
          ) : null}

          {viewMode === 'calendar' ? (
            <CalendarView
              refreshKey={refreshKey}
              canManage={canManage}
              onRequestGenerate={canManage ? handleOpenScheduleGenerator : undefined}
            />
          ) : (
            <ListView
              refreshKey={refreshKey}
              canManage={canManage}
              onRequestGenerate={canManage ? handleOpenScheduleGenerator : undefined}
            />
          )}
        </main>
      </div>

      {canManage ? (
        <ScheduleImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={handleScheduleGenerated}
        />
      ) : null}
    </div>
  );
}

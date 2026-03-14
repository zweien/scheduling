// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';

type ViewMode = 'calendar' | 'list';

// 占位组件
function StatisticsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">值班统计</h3>
        <p className="text-gray-500">统计功能开发中...</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded">关闭</button>
      </div>
    </div>
  );
}

function LogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">操作日志</h3>
        <p className="text-gray-500">日志功能开发中...</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded">关闭</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

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
    </div>
  );
}

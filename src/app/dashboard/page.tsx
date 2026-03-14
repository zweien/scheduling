// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        viewMode="calendar"
        onViewModeChange={() => {}}
        onShowStats={() => {}}
        onShowLogs={() => {}}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onScheduleGenerated={() => {}} />
        <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          <div className="text-center text-gray-500 py-20">选择日期范围生成排班</div>
        </main>
      </div>
    </div>
  );
}

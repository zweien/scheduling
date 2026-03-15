'use client';

import { Header } from '@/components/Header';
import { LogContent } from '@/components/LogDialog';

export default function LogsPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="日志" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">操作日志</h2>
              <p className="text-sm text-muted-foreground">查看系统中的关键操作记录与时间线。</p>
            </div>
            <LogContent />
          </div>
        </div>
      </main>
    </div>
  );
}


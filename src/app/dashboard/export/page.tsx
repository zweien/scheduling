'use client';

import { Header } from '@/components/Header';
import { ExportPanel } from '@/components/ExportDialog';

export default function ExportPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="导出" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">导出排班表</h2>
              <p className="text-sm text-muted-foreground">按日期范围导出 CSV、JSON 或 XLSX 文件。</p>
            </div>
            <ExportPanel />
          </div>
        </div>
      </main>
    </div>
  );
}


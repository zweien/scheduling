'use client';

import { Header } from '@/components/Header';
import { PrintPanel } from '@/components/PrintDialog';

export default function PrintPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="打印" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">打印排班表</h2>
              <p className="text-sm text-muted-foreground">支持列表模式和日历模式预览，并可直接打印。</p>
            </div>
            <PrintPanel />
          </div>
        </div>
      </main>
    </div>
  );
}


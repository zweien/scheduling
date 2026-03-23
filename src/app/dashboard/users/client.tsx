'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { DutyUserManagement } from '@/components/DutyUserManagement';
import { LeaderManagement } from '@/components/LeaderManagement';
import { Button } from '@/components/ui/button';

interface UsersPageClientProps {
  canManage: boolean;
}

export function UsersPageClient({ canManage }: UsersPageClientProps) {
  const [tab, setTab] = useState<'duty' | 'leader'>('duty');

  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="值班人员" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
          {/* 切换按钮 */}
          <div className="flex items-center border rounded-md overflow-hidden w-fit">
            <Button
              variant={tab === 'duty' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('duty')}
              className="rounded-none h-9 px-4"
            >
              值班人员
            </Button>
            <Button
              variant={tab === 'leader' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('leader')}
              className="rounded-none h-9 px-4"
            >
              值班领导
            </Button>
          </div>

          {/* 内容区域 */}
          {tab === 'duty' ? (
            <DutyUserManagement canManage={canManage} />
          ) : (
            <LeaderManagement canManage={canManage} />
          )}
        </div>
      </main>
    </div>
  );
}

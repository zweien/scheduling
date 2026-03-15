// src/components/ScheduleGenerator.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateScheduleAction } from '@/app/actions/schedule';
import { getUsers } from '@/app/actions/users';

interface ScheduleGeneratorProps {
  onGenerated: () => void;
}

export function ScheduleGenerator({ onGenerated }: ScheduleGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUserCount, setActiveUserCount] = useState(0);

  useEffect(() => {
    getUsers().then(users => {
      setActiveUserCount(users.filter(u => u.is_active).length);
    });
  }, []);

  async function handleGenerate() {
    if (!startDate) {
      setError('请选择开始日期');
      return;
    }

    if (endDate && startDate > endDate) {
      setError('开始日期不能晚于结束日期');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await generateScheduleAction(startDate, endDate || undefined);

    if (result.success) {
      onGenerated();
    } else {
      setError(result.error ?? '生成失败');
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="space-y-1">
        <Label htmlFor="startDate" className="text-xs">开始日期</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="h-8"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="endDate" className="text-xs">结束日期（可选）</Label>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="h-8"
        />
        {!endDate && activeUserCount > 0 && (
          <p className="text-xs text-muted-foreground">不填将排 {activeUserCount} 天</p>
        )}
      </div>

      <Button onClick={handleGenerate} disabled={loading} className="w-full h-8">
        {loading ? '生成中...' : '生成排班'}
      </Button>
    </div>
  );
}

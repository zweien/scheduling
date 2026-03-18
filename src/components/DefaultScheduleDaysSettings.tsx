'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateDefaultScheduleDaysAction } from '@/app/actions/config';

interface DefaultScheduleDaysSettingsProps {
  initialDays: number;
}

export function DefaultScheduleDaysSettings({ initialDays }: DefaultScheduleDaysSettingsProps) {
  const [days, setDays] = useState(String(initialDays));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const normalizedDays = Number.parseInt(days, 10);
    if (!Number.isFinite(normalizedDays) || normalizedDays < 1) {
      setError('默认排班天数必须大于等于 1');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateDefaultScheduleDaysAction(normalizedDays);
      if (!result.success) {
        setError(result.error ?? '更新默认排班天数失败');
        return;
      }

      toast.success('默认排班天数已更新');
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">默认排班天数</h3>
        <p className="text-xs text-muted-foreground">
          当只填写开始日期、不填写结束日期时，系统会按这里配置的天数自动生成排班。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default-schedule-days">默认排班天数</Label>
        <Input
          id="default-schedule-days"
          aria-label="默认排班天数"
          type="number"
          min={1}
          value={days}
          onChange={event => setDays(event.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          保存默认排班天数
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

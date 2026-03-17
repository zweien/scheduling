'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { updateRegistrationEnabledAction } from '@/app/actions/config';

interface RegistrationSettingsProps {
  initialEnabled: boolean;
}

export function RegistrationSettings({ initialEnabled }: RegistrationSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(nextEnabled: boolean) {
    setError(null);
    setEnabled(nextEnabled);

    startTransition(async () => {
      const result = await updateRegistrationEnabledAction(nextEnabled);
      if (!result.success) {
        setEnabled(!nextEnabled);
        setError('更新注册开关失败');
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">开放用户注册</h3>
          <p className="text-xs text-muted-foreground">
            开启后，登录页会显示注册入口，新增账号默认角色为普通用户。
          </p>
        </div>
        <Switch checked={enabled} disabled={isPending} onCheckedChange={handleToggle} />
      </div>

      <div className="text-xs text-muted-foreground">
        当前状态：{enabled ? '已开启' : '已关闭'}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}


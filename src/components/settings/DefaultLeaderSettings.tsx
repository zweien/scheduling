'use client';

import { useEffect, useState } from 'react';
import { getDefaultLeader, setDefaultLeaderAction, getLeadersForSelect } from '@/app/actions/leader-schedules';
import type { Leader } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DefaultLeaderSettings() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [currentDefaultId, setCurrentDefaultId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const [leadersData, defaultLeader] = await Promise.all([
        getLeadersForSelect(),
        getDefaultLeader(),
      ]);
      setLeaders(leadersData.filter(l => l.is_active));
      setCurrentDefaultId(defaultLeader?.id ?? null);
      setSelectedId(defaultLeader?.id?.toString() ?? '');
    })();
  }, []);

  async function handleSave() {
    setLoading(true);
    const newId = selectedId ? parseInt(selectedId, 10) : null;
    await setDefaultLeaderAction(newId);
    setCurrentDefaultId(newId);
    setLoading(false);
  }

  function handleValueChange(value: string | null) {
    setSelectedId(value ?? '');
  }

  const hasChanges = selectedId !== (currentDefaultId?.toString() ?? '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedId} onValueChange={handleValueChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="选择默认值班领导" />
          </SelectTrigger>
          <SelectContent>
            {leaders.length === 0 ? (
              <SelectItem value="" disabled>请先添加值班领导</SelectItem>
            ) : (
              leaders.map(leader => (
                <SelectItem key={leader.id} value={leader.id.toString()}>
                  {leader.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={loading || !hasChanges}>
          保存
        </Button>
      </div>
      {leaders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          请先在「人员管理 - 值班领导」中添加值班领导
        </p>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createLeader,
  deleteLeaderAction,
  getLeaders,
  toggleLeaderActiveAction,
  getLeaderScheduleCountAction,
} from '@/app/actions/leaders';
import type { Leader } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Trash2, UserCheck, UserX } from 'lucide-react';

interface LeaderManagementProps {
  canManage: boolean;
}

export function LeaderManagement({ canManage }: LeaderManagementProps) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [formName, setFormName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLeaders = useCallback(async () => {
    const items = await getLeaders();
    setLeaders(items);
  }, []);

  useEffect(() => {
    void (async () => {
      const items = await getLeaders();
      setLeaders(items);
    })();
  }, []);

  function resetForm() {
    setEditingId(null);
    setFormName('');
    setError(null);
  }

  async function handleSubmit() {
    if (!formName.trim()) {
      setError('请输入领导姓名');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createLeader(formName.trim());

    setLoading(false);

    if (!result.success) {
      setError('保存失败');
      return;
    }

    resetForm();
    await loadLeaders();
  }

  async function handleDelete(leader: Leader) {
    const scheduleCount = await getLeaderScheduleCountAction(leader.id);

    const message = scheduleCount > 0
      ? `确认删除「${leader.name}」吗？该领导有 ${scheduleCount} 条排班记录将被一并删除。`
      : `确认删除「${leader.name}」吗？`;

    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }

    await deleteLeaderAction(leader.id);
    await loadLeaders();
  }

  async function handleToggleActive(leader: Leader) {
    await toggleLeaderActiveAction(leader.id, !leader.is_active);
    await loadLeaders();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-lg font-medium mb-3">
            {editingId ? '编辑值班领导' : '添加值班领导'}
          </h3>
          <div className="flex gap-2">
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="输入领导姓名"
              disabled={loading}
            />
            <Button onClick={handleSubmit} disabled={loading}>
              {editingId ? '保存' : '添加'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                取消
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </section>
      ) : null}

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-lg font-medium mb-3">值班领导列表</h3>
        {leaders.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无值班领导</p>
        ) : (
          <div className="space-y-2">
            {leaders.map(leader => (
              <div
                key={leader.id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-background"
              >
                {canManage && (
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                )}
                <span className={`flex-1 ${!leader.is_active ? 'text-muted-foreground line-through' : ''}`}>
                  {leader.name}
                </span>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleToggleActive(leader)}
                      title={leader.is_active ? '禁用' : '启用'}
                    >
                      {leader.is_active ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(leader)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createDutyUser, getDutyUsers, removeUser, updateDutyUserProfile, updateUserActiveAction } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User, UserCategory, UserOrganization } from '@/types';

type FiltersState = {
  search: string;
  organization: UserOrganization | '';
  category: UserCategory | '';
  status: 'active' | 'inactive' | '';
};

const initialFilters: FiltersState = {
  search: '',
  organization: '',
  category: '',
  status: '',
};

const initialForm = {
  name: '',
  organization: 'W' as UserOrganization,
  category: 'W' as UserCategory,
  notes: '',
};

export function DutyUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers(nextFilters: FiltersState) {
    const items = await getDutyUsers(nextFilters);
    setUsers(items);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers(filters);
    });
  }, [filters]);

  function updateFilter<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      organization: user.organization,
      category: user.category,
      notes: user.notes ?? '',
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const result = editingId === null
      ? await createDutyUser(form)
      : await updateDutyUserProfile({ id: editingId, ...form });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? '保存失败');
      return;
    }

    resetForm();
    await loadUsers(filters);
  }

  async function handleDelete(user: User) {
    await removeUser(user.id, user.name);
    await loadUsers(filters);
  }

  async function handleToggleActive(user: User) {
    await updateUserActiveAction(user.id, !user.is_active);
    await loadUsers(filters);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-muted/30 p-4">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold">值班人员管理</h2>
          <p className="text-sm text-muted-foreground">维护值班人员资料、参与状态、所属单位与人员类别。</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="duty-user-search">搜索</Label>
            <Input
              id="duty-user-search"
              placeholder="搜索姓名或备注"
              value={filters.search}
              onChange={event => updateFilter('search', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duty-user-organization">所属单位</Label>
            <select
              id="duty-user-organization"
              aria-label="所属单位"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={filters.organization}
              onChange={event => updateFilter('organization', event.target.value as UserOrganization | '')}
            >
              <option value="">全部单位</option>
              <option value="W">W</option>
              <option value="X">X</option>
              <option value="Z">Z</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duty-user-category">人员类别</Label>
            <select
              id="duty-user-category"
              aria-label="人员类别"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={filters.category}
              onChange={event => updateFilter('category', event.target.value as UserCategory | '')}
            >
              <option value="">全部类别</option>
              <option value="J">J</option>
              <option value="W">W</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="duty-user-status">参与状态</Label>
            <select
              id="duty-user-status"
              aria-label="参与状态"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={filters.status}
              onChange={event => updateFilter('status', event.target.value as FiltersState['status'])}
            >
              <option value="">全部状态</option>
              <option value="active">参与值班</option>
              <option value="inactive">已停用</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setFilters(initialFilters)}>重置筛选</Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold">{editingId === null ? '新增值班人员' : '编辑值班人员'}</h3>
          <p className="text-sm text-muted-foreground">填写人员基础资料，供排班和筛选使用。</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="duty-user-name">姓名</Label>
            <Input id="duty-user-name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duty-user-form-organization">所属单位</Label>
            <select
              id="duty-user-form-organization"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={form.organization}
              onChange={event => setForm(current => ({ ...current, organization: event.target.value as UserOrganization }))}
            >
              <option value="W">W</option>
              <option value="X">X</option>
              <option value="Z">Z</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duty-user-form-category">人员类别</Label>
            <select
              id="duty-user-form-category"
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={form.category}
              onChange={event => setForm(current => ({ ...current, category: event.target.value as UserCategory }))}
            >
              <option value="J">J</option>
              <option value="W">W</option>
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="duty-user-notes">备注</Label>
            <Input id="duty-user-notes" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          {error ? <div className="text-sm text-destructive">{error}</div> : <div />}
          <div className="flex gap-2">
            {editingId !== null ? (
              <Button variant="outline" onClick={resetForm}>取消编辑</Button>
            ) : null}
            <Button onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? '保存中...' : editingId === null ? '新增人员' : '保存修改'}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{user.name}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{user.organization}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{user.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {user.is_active ? '参与值班' : '已停用'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{user.notes || '无备注'}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(user)}>编辑</Button>
                <Button variant="outline" size="sm" onClick={() => void handleToggleActive(user)}>
                  {user.is_active ? '停用' : '启用'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => void handleDelete(user)}>删除</Button>
              </div>
            </div>
          </div>
        ))}

        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            当前筛选条件下没有值班人员
          </div>
        ) : null}
      </section>
    </div>
  );
}

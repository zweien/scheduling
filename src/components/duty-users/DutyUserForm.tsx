'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DutyUserFormState } from './types';

export interface ConfigOptionSimple {
  value: string;
  label: string;
}

interface DutyUserFormProps {
  form: DutyUserFormState;
  editingId: number | null;
  error: string | null;
  loading: boolean;
  organizationOptions: ConfigOptionSimple[];
  categoryOptions: ConfigOptionSimple[];
  onChange: <K extends keyof DutyUserFormState>(key: K, value: DutyUserFormState[K]) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function DutyUserForm({
  form,
  editingId,
  error,
  loading,
  organizationOptions,
  categoryOptions,
  onChange,
  onCancel,
  onSubmit,
}: DutyUserFormProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold">{editingId === null ? '新增值班人员' : '编辑值班人员'}</h3>
        <p className="text-sm text-muted-foreground">填写人员基础资料，供排班和筛选使用。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="duty-user-name">姓名</Label>
          <Input id="duty-user-name" value={form.name} onChange={event => onChange('name', event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duty-user-form-organization">所属单位</Label>
          <select
            id="duty-user-form-organization"
            className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={form.organization}
            onChange={event => onChange('organization', event.target.value)}
          >
            {organizationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duty-user-form-category">人员类别</Label>
          <select
            id="duty-user-form-category"
            className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={form.category}
            onChange={event => onChange('category', event.target.value)}
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="duty-user-notes">备注</Label>
          <Input id="duty-user-notes" value={form.notes} onChange={event => onChange('notes', event.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        {error ? <div className="text-sm text-destructive">{error}</div> : <div />}
        <div className="flex gap-2">
          {editingId !== null ? (
            <Button variant="outline" onClick={onCancel}>取消编辑</Button>
          ) : null}
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? '保存中...' : editingId === null ? '新增人员' : '保存修改'}
          </Button>
        </div>
      </div>
    </section>
  );
}

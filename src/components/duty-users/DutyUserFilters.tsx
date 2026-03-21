'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DutyUserFiltersState } from './types';

export interface ConfigOptionSimple {
  value: string;
  label: string;
}

interface DutyUserFiltersProps {
  filters: DutyUserFiltersState;
  organizationOptions: ConfigOptionSimple[];
  categoryOptions: ConfigOptionSimple[];
  onFilterChange: <K extends keyof DutyUserFiltersState>(key: K, value: DutyUserFiltersState[K]) => void;
  onReset: () => void;
}

export function DutyUserFilters({
  filters,
  organizationOptions,
  categoryOptions,
  onFilterChange,
  onReset,
}: DutyUserFiltersProps) {
  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold">检索与筛选</h3>
        <p className="text-sm text-muted-foreground">按姓名、备注、所属单位、人员类别和参与状态筛选当前列表。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="duty-user-search">搜索</Label>
          <Input
            id="duty-user-search"
            placeholder="搜索姓名或备注"
            value={filters.search}
            onChange={event => onFilterChange('search', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duty-user-organization">所属单位</Label>
          <select
            id="duty-user-organization"
            aria-label="所属单位"
            className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={filters.organization}
            onChange={event => onFilterChange('organization', event.target.value)}
          >
            <option value="">全部单位</option>
            {organizationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duty-user-category">人员类别</Label>
          <select
            id="duty-user-category"
            aria-label="人员类别"
            className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={filters.category}
            onChange={event => onFilterChange('category', event.target.value)}
          >
            <option value="">全部类别</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
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
            onChange={event => onFilterChange('status', event.target.value as DutyUserFiltersState['status'])}
          >
            <option value="">全部状态</option>
            <option value="active">参与值班</option>
            <option value="inactive">已停用</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={onReset}>重置筛选</Button>
        </div>
      </div>
    </section>
  );
}

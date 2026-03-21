# 字段配置化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现值班人员"所属单位"和"人员类别"的可配置化，支持管理员自定义选项。

**Architecture:** 使用 SQLite 单表存储配置选项，通过数据库迁移自动创建表和初始化默认数据，在设置页面新增管理界面，动态更新表单和导入功能。

**Tech Stack:** Next.js 16, TypeScript, SQLite (better-sqlite3), React, Tailwind CSS

---

## 文件结构

```
src/
├── lib/
│   ├── db/
│   │   └── migrations.ts          # 修改: 新增 007_config_options 迁移
│   ├── config-options.ts          # 新增: 配置选项 CRUD
│   └── imports/
│       ├── duty-users-template.ts # 修改: 动态生成模板
│       └── duty-users-import.ts   # 修改: 动态校验
├── app/
│   ├── actions/
│   │   ├── config-options.ts      # 新增: Server Actions
│   │   └── users.ts               # 修改: 获取配置选项传递给组件
│   └── dashboard/
│       └── settings/
│           └── page.tsx           # 修改: 新增字段配置 section
├── components/
│   ├── settings/
│   │   ├── ConfigOptionsSection.tsx  # 新增: 配置管理主组件
│   │   ├── ConfigOptionList.tsx      # 新增: 配置列表
│   │   └── ConfigOptionDialog.tsx    # 新增: 新增/编辑弹窗
│   └── duty-users/
│       ├── DutyUserForm.tsx       # 修改: 动态加载下拉选项
│       ├── DutyUserFilters.tsx    # 修改: 动态加载筛选选项
│       └── types.ts               # 修改: 更新类型定义
└── types/
    └── index.ts                   # 修改: 新增/修改类型
```

---

## Task 1: 数据库迁移 - 新增 config_options 表

**Files:**
- Modify: `src/lib/db/migrations.ts`

- [ ] **Step 1: 添加迁移定义**

在 `MIGRATIONS` 数组末尾添加新的迁移：

```typescript
{
  version: '007_config_options',
  up(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS config_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_options_type_value
        ON config_options(type, value);
    `);

    // 初始化默认配置
    const insert = database.prepare(`
      INSERT INTO config_options (type, value, label, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    // 单位默认值
    insert.run('organization', 'W', 'W', 1);
    insert.run('organization', 'X', 'X', 2);
    insert.run('organization', 'Z', 'Z', 3);

    // 类别默认值
    insert.run('category', 'J', 'J', 1);
    insert.run('category', 'W', 'W', 2);
  },
},
```

- [ ] **Step 2: 验证迁移**

```bash
bun dev
```

启动开发服务器，检查数据库是否正确创建表和初始数据。

- [ ] **Step 3: 提交**

```bash
git add src/lib/db/migrations.ts
git commit -m "feat(db): 新增 config_options 表迁移

- 创建 config_options 表存储可配置选项
- 初始化默认单位 (W/X/Z) 和类别 (J/W)
- 添加 type+value 唯一索引

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 类型定义更新

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/components/duty-users/types.ts`

- [ ] **Step 1: 更新 src/types/index.ts**

添加新类型，保留旧类型别名以保持兼容：

```typescript
// 新增配置选项类型
export type ConfigOptionType = 'organization' | 'category';

export interface ConfigOption {
  id: number;
  type: ConfigOptionType;
  value: string;
  label: string;
  sort_order: number;
  created_at: string;
}

// 保留类型别名以兼容现有代码（逐步迁移）
// 后续可删除
export type UserOrganization = string;
export type UserCategory = string;
```

- [ ] **Step 2: 验证类型检查**

```bash
bun run build
```

确保没有类型错误。

- [ ] **Step 3: 提交**

```bash
git add src/types/index.ts
git commit -m "types: 新增 ConfigOption 类型定义

- 添加 ConfigOptionType 和 ConfigOption 接口
- 保留 UserOrganization/UserCategory 别名以兼容

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 后端 API 层 - 配置选项 CRUD

**Files:**
- Create: `src/lib/config-options.ts`

- [ ] **Step 1: 创建配置选项模块**

```typescript
// src/lib/config-options.ts
import db from './db';
import type { ConfigOption, ConfigOptionType } from '@/types';

export function getConfigOptions(type?: ConfigOptionType): ConfigOption[] {
  if (type) {
    return db.prepare(
      'SELECT * FROM config_options WHERE type = ? ORDER BY sort_order'
    ).all(type) as ConfigOption[];
  }
  return db.prepare(
    'SELECT * FROM config_options ORDER BY type, sort_order'
  ).all() as ConfigOption[];
}

export function getConfigOptionByValue(
  type: ConfigOptionType,
  value: string
): ConfigOption | undefined {
  return db.prepare(
    'SELECT * FROM config_options WHERE type = ? AND value = ?'
  ).get(type, value) as ConfigOption | undefined;
}

export function createConfigOption(input: {
  type: ConfigOptionType;
  value: string;
  label: string;
}): ConfigOption {
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max FROM config_options WHERE type = ?'
  ).get(input.type) as { max: number | null };

  const result = db.prepare(`
    INSERT INTO config_options (type, value, label, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(input.type, input.value, input.label, (maxOrder.max ?? 0) + 1);

  return getConfigOptionById(result.lastInsertRowid as number)!;
}

export function updateConfigOption(
  id: number,
  input: { value?: string; label?: string }
): ConfigOption {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (input.value !== undefined) {
    fields.push('value = ?');
    values.push(input.value);
  }
  if (input.label !== undefined) {
    fields.push('label = ?');
    values.push(input.label);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE config_options SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getConfigOptionById(id)!;
}

export function deleteConfigOption(id: number): { success: boolean; error?: string } {
  const option = getConfigOptionById(id);
  if (!option) {
    return { success: false, error: '配置项不存在' };
  }

  const field = option.type === 'organization' ? 'organization' : 'category';
  const count = db.prepare(
    `SELECT COUNT(*) as count FROM users WHERE ${field} = ?`
  ).get(option.value) as { count: number };

  if (count.count > 0) {
    return {
      success: false,
      error: `该配置项已关联 ${count.count} 名人员，无法删除`
    };
  }

  db.prepare('DELETE FROM config_options WHERE id = ?').run(id);
  return { success: true };
}

export function reorderConfigOptions(
  type: ConfigOptionType,
  ids: number[]
): void {
  const update = db.prepare('UPDATE config_options SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  transaction();
}

export function isValidConfigValue(type: ConfigOptionType, value: string): boolean {
  return getConfigOptionByValue(type, value) !== undefined;
}

function getConfigOptionById(id: number): ConfigOption | undefined {
  return db.prepare('SELECT * FROM config_options WHERE id = ?').get(id) as ConfigOption | undefined;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/config-options.ts
git commit -m "feat(lib): 新增配置选项 CRUD 模块

- getConfigOptions: 查询配置选项
- createConfigOption: 创建新选项
- updateConfigOption: 更新选项
- deleteConfigOption: 删除选项（有关联时阻止）
- reorderConfigOptions: 重排序
- isValidConfigValue: 校验值有效性

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Server Actions - 配置选项

**Files:**
- Create: `src/app/actions/config-options.ts`

- [ ] **Step 1: 创建 Server Actions**

```typescript
// src/app/actions/config-options.ts
'use server';

import {
  getConfigOptions,
  createConfigOption,
  updateConfigOption,
  deleteConfigOption,
  reorderConfigOptions,
} from '@/lib/config-options';
import type { ConfigOptionType } from '@/types';

export async function getOrganizationOptions() {
  return getConfigOptions('organization');
}

export async function getCategoryOptions() {
  return getConfigOptions('category');
}

export async function saveConfigOption(
  id: number | null,
  type: ConfigOptionType,
  value: string,
  label: string
) {
  if (id === null) {
    return createConfigOption({ type, value, label });
  }
  return updateConfigOption(id, { value, label });
}

export async function deleteConfigOptionAction(id: number) {
  return deleteConfigOption(id);
}

export async function reorderConfigOptionsAction(
  type: ConfigOptionType,
  ids: number[]
) {
  reorderConfigOptions(type, ids);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/actions/config-options.ts
git commit -m "feat(actions): 新增配置选项 Server Actions

- getOrganizationOptions: 获取单位选项
- getCategoryOptions: 获取类别选项
- saveConfigOption: 新增或更新选项
- deleteConfigOptionAction: 删除选项
- reorderConfigOptionsAction: 重排序选项

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: UI 组件 - 字段配置管理

**Files:**
- Create: `src/components/settings/ConfigOptionsSection.tsx`
- Create: `src/components/settings/ConfigOptionList.tsx`
- Create: `src/components/settings/ConfigOptionDialog.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: 创建 ConfigOptionDialog 组件**

```typescript
// src/components/settings/ConfigOptionDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfigOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOption: { id: number; value: string; label: string } | null;
  typeLabel: string;
  onSave: (value: string, label: string) => void;
  loading: boolean;
}

export function ConfigOptionDialog({
  open,
  onOpenChange,
  editingOption,
  typeLabel,
  onSave,
  loading,
}: ConfigOptionDialogProps) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (editingOption) {
      setValue(editingOption.value);
      setLabel(editingOption.label);
    } else {
      setValue('');
      setLabel('');
    }
  }, [editingOption, open]);

  const handleSubmit = () => {
    if (!value.trim() || !label.trim()) {
      return;
    }
    onSave(value.trim(), label.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editingOption ? `编辑${typeLabel}` : `新增${typeLabel}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="option-value">值</Label>
            <Input
              id="option-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="如: BJ"
              maxLength={10}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="option-label">显示名称</Label>
            <Input
              id="option-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="如: 北京分部"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !value.trim() || !label.trim()}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 创建 ConfigOptionList 组件**

```typescript
// src/components/settings/ConfigOptionList.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { ConfigOption } from '@/types';

interface ConfigOptionListProps {
  options: ConfigOption[];
  onEdit: (option: ConfigOption) => void;
  onDelete: (option: ConfigOption) => void;
  onMoveUp: (option: ConfigOption) => void;
  onMoveDown: (option: ConfigOption) => void;
}

export function ConfigOptionList({
  options,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ConfigOptionListProps) {
  if (options.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        暂无配置项，点击"新增"添加
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {options.map((option, index) => (
        <div
          key={option.id}
          className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
        >
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
              {option.value}
            </span>
            <span className="text-sm">{option.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveUp(option)}
              disabled={index === 0}
              className="h-8 w-8 p-0"
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveDown(option)}
              disabled={index === options.length - 1}
              className="h-8 w-8 p-0"
            >
              ↓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(option)}
              className="h-8 px-2"
            >
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(option)}
              className="h-8 px-2 text-destructive hover:text-destructive"
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ConfigOptionsSection 组件**

```typescript
// src/components/settings/ConfigOptionsSection.tsx
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  saveConfigOption,
  deleteConfigOptionAction,
  reorderConfigOptionsAction,
} from '@/app/actions/config-options';
import type { ConfigOption, ConfigOptionType } from '@/types';
import { ConfigOptionList } from './ConfigOptionList';
import { ConfigOptionDialog } from './ConfigOptionDialog';

interface ConfigOptionsSectionProps {
  initialOrganizations: ConfigOption[];
  initialCategories: ConfigOption[];
}

export function ConfigOptionsSection({
  initialOrganizations,
  initialCategories,
}: ConfigOptionsSectionProps) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<ConfigOptionType>('organization');
  const [editingOption, setEditingOption] = useState<{ id: number; value: string; label: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingOption, setDeletingOption] = useState<ConfigOption | null>(null);
  const [loading, setLoading] = useState(false);

  const getOptions = useCallback((type: ConfigOptionType) => {
    return type === 'organization' ? organizations : categories;
  }, [organizations, categories]);

  const setOptions = useCallback((type: ConfigOptionType, newOptions: ConfigOption[]) => {
    if (type === 'organization') {
      setOrganizations(newOptions);
    } else {
      setCategories(newOptions);
    }
  }, []);

  const openAddDialog = (type: ConfigOptionType) => {
    setDialogType(type);
    setEditingOption(null);
    setDialogOpen(true);
  };

  const openEditDialog = (option: ConfigOption) => {
    setDialogType(option.type);
    setEditingOption({ id: option.id, value: option.value, label: option.label });
    setDialogOpen(true);
  };

  const handleSave = async (value: string, label: string) => {
    setLoading(true);
    const result = await saveConfigOption(
      editingOption?.id ?? null,
      dialogType,
      value,
      label
    );
    setLoading(false);

    if ('id' in result) {
      if (editingOption) {
        setOptions(dialogType, getOptions(dialogType).map(o =>
          o.id === result.id ? result : o
        ));
        toast.success('修改成功');
      } else {
        setOptions(dialogType, [...getOptions(dialogType), result]);
        toast.success('新增成功');
      }
      setDialogOpen(false);
    }
  };

  const handleDeleteClick = (option: ConfigOption) => {
    setDeletingOption(option);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOption) return;

    setLoading(true);
    const result = await deleteConfigOptionAction(deletingOption.id);
    setLoading(false);

    if (result.success) {
      setOptions(deletingOption.type, getOptions(deletingOption.type).filter(o => o.id !== deletingOption.id));
      toast.success('删除成功');
      setDeleteConfirmOpen(false);
      setDeletingOption(null);
    } else {
      toast.error(result.error ?? '删除失败');
    }
  };

  const handleMoveUp = async (option: ConfigOption) => {
    const options = getOptions(option.type);
    const index = options.findIndex(o => o.id === option.id);
    if (index <= 0) return;

    const newOptions = [...options];
    [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
    setOptions(option.type, newOptions);

    await reorderConfigOptionsAction(option.type, newOptions.map(o => o.id));
  };

  const handleMoveDown = async (option: ConfigOption) => {
    const options = getOptions(option.type);
    const index = options.findIndex(o => o.id === option.id);
    if (index >= options.length - 1) return;

    const newOptions = [...options];
    [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    setOptions(option.type, newOptions);

    await reorderConfigOptionsAction(option.type, newOptions.map(o => o.id));
  };

  return (
    <>
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">字段配置</h2>
          <p className="text-sm text-muted-foreground">
            管理值班人员的所属单位和人员类别选项。
          </p>
        </div>

        <div className="space-y-6">
          {/* 所属单位 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">所属单位</h3>
              <Button size="sm" onClick={() => openAddDialog('organization')}>
                新增
              </Button>
            </div>
            <ConfigOptionList
              options={organizations}
              onEdit={openEditDialog}
              onDelete={handleDeleteClick}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </div>

          {/* 人员类别 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">人员类别</h3>
              <Button size="sm" onClick={() => openAddDialog('category')}>
                新增
              </Button>
            </div>
            <ConfigOptionList
              options={categories}
              onEdit={openEditDialog}
              onDelete={handleDeleteClick}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </div>
        </div>
      </section>

      <ConfigOptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingOption={editingOption}
        typeLabel={dialogType === 'organization' ? '单位' : '类别'}
        onSave={handleSave}
        loading={loading}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除"{deletingOption?.label}"吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={loading}>
              {loading ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 4: 修改设置页面**

在 `src/app/dashboard/settings/page.tsx` 中添加：

```typescript
// 顶部新增导入
import { getConfigOptions } from '@/lib/config-options';
import { ConfigOptionsSection } from '@/components/settings/ConfigOptionsSection';

// 在函数体内获取配置
const organizations = getConfigOptions('organization');
const categories = getConfigOptions('category');

// 在 return 的 grid 内，管理员区块中添加（在 "修改密码" section 之前）
{isAdmin ? (
  <ConfigOptionsSection
    initialOrganizations={organizations}
    initialCategories={categories}
  />
) : null}
```

- [ ] **Step 5: 验证功能**

```bash
bun dev
```

访问设置页面，验证字段配置功能正常工作。

- [ ] **Step 6: 提交**

```bash
git add src/components/settings/ src/app/dashboard/settings/page.tsx
git commit -m "feat(ui): 新增字段配置管理界面

- ConfigOptionDialog: 新增/编辑弹窗
- ConfigOptionList: 配置列表展示
- ConfigOptionsSection: 主组件整合
- 集成到设置页面（仅管理员可见）

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 表单组件改造 - 动态加载下拉选项

**Files:**
- Modify: `src/components/duty-users/DutyUserForm.tsx`
- Modify: `src/components/duty-users/DutyUserFilters.tsx`
- Modify: `src/components/duty-users/types.ts`
- Modify: `src/components/DutyUserManagement.tsx`
- Modify: `src/app/actions/users.ts`

- [ ] **Step 1: 修改 DutyUserForm 组件**

添加 `options` prop 用于动态渲染下拉选项：

```typescript
// src/components/duty-users/DutyUserForm.tsx
// 在 interface 中添加:
interface DutyUserFormProps {
  // ... 现有 props
  organizationOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
}

// 修改 select 渲染:
<select ...>
  {organizationOptions.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>

<select ...>
  {categoryOptions.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

- [ ] **Step 2: 修改 DutyUserFilters 组件**

同样添加动态选项支持。

- [ ] **Step 3: 修改 DutyUserManagement 组件**

从 Server Action 获取配置选项并传递给子组件。

- [ ] **Step 4: 修改 users Server Action**

新增获取配置选项的函数：

```typescript
export async function getDutyUserConfigOptions() {
  const organizations = getConfigOptions('organization');
  const categories = getConfigOptions('category');
  return {
    organizations: organizations.map(o => ({ value: o.value, label: o.label })),
    categories: categories.map(c => ({ value: c.value, label: c.label })),
  };
}
```

- [ ] **Step 5: 验证功能**

```bash
bun dev
```

验证值班人员管理页面的表单和筛选器正常工作。

- [ ] **Step 6: 提交**

```bash
git add src/components/duty-users/ src/components/DutyUserManagement.tsx src/app/actions/users.ts
git commit -m "refactor(duty-users): 表单和筛选器动态加载配置选项

- DutyUserForm: 接收动态选项 props
- DutyUserFilters: 接收动态选项 props
- DutyUserManagement: 获取并传递配置选项
- users action: 新增 getDutyUserConfigOptions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 导入功能改造 - 动态模板和校验

**Files:**
- Modify: `src/lib/imports/duty-users-template.ts`
- Modify: `src/lib/imports/duty-users-import.ts`

- [ ] **Step 1: 修改模板生成**

```typescript
// src/lib/imports/duty-users-template.ts
import { getConfigOptions } from '@/lib/config-options';

export async function buildDutyUsersTemplateWorkbook(): Promise<Buffer> {
  const organizations = getConfigOptions('organization');
  const categories = getConfigOptions('category');

  // 动态生成表头提示
  const orgLabels = organizations.map(o => o.value).join('/');
  const categoryLabels = categories.map(c => c.value).join('/');

  const TEMPLATE_HEADERS = [
    '姓名（必填）',
    `所属单位（必填，${orgLabels}）`,
    `人员类别（必填，${categoryLabels}）`,
    '是否参与值班（必填，是/否）',
    '备注（选填）',
  ];

  // ... 其余模板生成逻辑
}
```

- [ ] **Step 2: 修改导入校验**

```typescript
// src/lib/imports/duty-users-import.ts
import { getConfigOptions, isValidConfigValue } from '@/lib/config-options';

export async function previewDutyUsersImport(fileBuffer: Buffer): Promise<DutyUserImportPreview> {
  // 动态获取有效值
  const orgOptions = getConfigOptions('organization');
  const categoryOptions = getConfigOptions('category');

  // 校验时使用动态值
  if (!isValidConfigValue('organization', organization)) {
    const validLabels = orgOptions.map(o => o.label).join('、');
    rowIssues.push({
      row: rowNumber,
      field: '所属单位',
      message: `所属单位必须是 ${validLabels} 之一`
    });
  }

  // 类似处理 category...
}
```

- [ ] **Step 3: 验证导入功能**

```bash
bun dev
```

下载模板，填写数据，验证导入校验正常工作。

- [ ] **Step 4: 提交**

```bash
git add src/lib/imports/
git commit -m "refactor(imports): 动态生成模板和校验逻辑

- 模板表头动态显示有效选项
- 导入校验使用数据库配置
- 错误提示显示实际配置的名称

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 集成测试与最终提交

- [ ] **Step 1: 运行完整构建**

```bash
bun run build
```

确保无编译错误。

- [ ] **Step 2: 手动测试清单**

- [ ] 设置页面能正常显示字段配置
- [ ] 能新增/编辑/删除配置项
- [ ] 删除有关联人员的配置项时显示错误
- [ ] 排序功能正常
- [ ] 值班人员表单下拉选项正确
- [ ] 筛选器下拉选项正确
- [ ] 下载的模板包含当前配置
- [ ] 导入校验使用当前配置

- [ ] **Step 3: 推送所有提交**

```bash
git push
```

---

## 风险与注意事项

1. **向下兼容**：默认配置值与原硬编码值一致，确保平滑升级
2. **删除保护**：有关联人员的配置项不允许删除
3. **导入模板**：配置变更后，旧模板可能失效，需提示用户下载新模板
4. **缓存**：配置选项在页面加载时获取，后续操作需刷新或重新获取

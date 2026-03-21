# 字段配置化设计文档

## 背景

当前系统中，值班人员的"所属单位"和"人员类别"是硬编码的：
- 单位：W, X, Z
- 类别：J, W

用户需要能够自定义这些选项，以适应不同团队的实际需求。

## 需求确认

| 需求项 | 决策 |
|--------|------|
| 自定义能力 | 完全自定义（可添加/删除/修改任意选项） |
| 存储方式 | SQLite 数据库 |
| 管理界面 | 集成到现有设置页面 |
| 导入处理 | 模板动态生成 + 严格校验 |
| 数据迁移 | 自动迁移，首次启动初始化默认值 |

## 数据库设计

### 新增 `config_options` 表

```sql
CREATE TABLE config_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'organization' | 'category'
  value TEXT NOT NULL,          -- 存储值，如 "W"
  label TEXT NOT NULL,          -- 显示名称，如 "北京分部"
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_config_options_type_value
  ON config_options(type, value);
```

### 初始化数据

首次启动时自动插入默认配置：

**organization (单位):**
| value | label | sort_order |
|-------|-------|------------|
| W | W | 1 |
| X | X | 2 |
| Z | Z | 3 |

**category (类别):**
| value | label | sort_order |
|-------|-------|------------|
| J | J | 1 |
| W | W | 2 |

## 类型定义

### 新增类型 (`src/types/index.ts`)

```typescript
export type ConfigOptionType = 'organization' | 'category';

export interface ConfigOption {
  id: number;
  type: ConfigOptionType;
  value: string;
  label: string;
  sort_order: number;
  created_at: string;
}
```

### 类型变更

移除硬编码类型，改为 `string`：

```typescript
// 删除
export type UserOrganization = 'W' | 'X' | 'Z';
export type UserCategory = 'J' | 'W';

// User 接口变更
export interface User {
  // ...
  organization: string;  // 原 UserOrganization
  category: string;      // 原 UserCategory
  // ...
}
```

## 后端 API 层

### 新增 `src/lib/config-options.ts`

```typescript
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

  // 检查是否有关联人员
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

### Server Actions (`src/app/actions/config-options.ts`)

```typescript
'use server';

import { getConfigOptions, createConfigOption, updateConfigOption, deleteConfigOption, reorderConfigOptions } from '@/lib/config-options';
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

## UI 设计

### 设置页面新增 Tab

在 `/dashboard/settings` 页面新增 **"字段配置"** Tab。

**组件结构：**

```
src/components/settings/
├── ConfigOptionsSection.tsx      # 主组件
├── ConfigOptionList.tsx          # 配置列表
└── ConfigOptionDialog.tsx        # 新增/编辑弹窗
```

**布局示意：**

```
┌─────────────────────────────────────────────────┐
│  [系统设置] [账号管理] [API Token] [字段配置]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  所属单位配置                        [+ 新增]   │
│  ┌─────────────────────────────────────────┐   │
│  │ 值    显示名称         操作              │   │
│  │ W     北京分部    [↑][↓][编辑][删除]     │   │
│  │ X     上海分部    [↑][↓][编辑][删除]     │   │
│  │ Z     广州分部    [↑][↓][编辑][删除]     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  人员类别配置                        [+ 新增]   │
│  ┌─────────────────────────────────────────┐   │
│  │ 值    显示名称         操作              │   │
│  │ J     正式员工    [↑][↓][编辑][删除]     │   │
│  │ W     外包人员    [↑][↓][编辑][删除]     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**交互细节：**

1. **新增/编辑**：弹出 Dialog，包含"值"和"显示名称"两个输入框
2. **删除**：二次确认 Dialog，若有关联人员则显示错误提示
3. **排序**：上移/下移按钮，实时更新 sort_order

## 导入功能改造

### 模板生成 (`src/lib/imports/duty-users-template.ts`)

改造为动态生成下拉选项：

```typescript
import { getConfigOptions } from '@/lib/config-options';

export async function generateTemplate(): Promise<Buffer> {
  const organizations = getConfigOptions('organization');
  const categories = getConfigOptions('category');

  // 使用 organizations 和 categories 生成下拉列表
  // ...
}
```

### 导入校验 (`src/lib/imports/duty-users-import.ts`)

```typescript
import { getConfigOptions, isValidConfigValue } from '@/lib/config-options';

// 校验时动态获取有效值
const orgOptions = getConfigOptions('organization');
const categoryOptions = getConfigOptions('category');

// 校验逻辑
if (!isValidConfigValue('organization', organization)) {
  const validLabels = orgOptions.map(o => o.label).join('、');
  rowIssues.push({
    row: rowNumber,
    field: '所属单位',
    message: `所属单位必须是 ${validLabels} 之一`
  });
}
```

## 数据迁移

### 迁移逻辑（在 `src/lib/db.ts` 初始化时）

```typescript
function initializeConfigOptions() {
  // 检查表是否存在
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='config_options'
  `).get();

  if (!tableExists) {
    // 创建表
    db.exec(`
      CREATE TABLE config_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX idx_config_options_type_value
        ON config_options(type, value);
    `);

    // 初始化默认配置
    const insert = db.prepare(`
      INSERT INTO config_options (type, value, label, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    insert.run('organization', 'W', 'W', 1);
    insert.run('organization', 'X', 'X', 2);
    insert.run('organization', 'Z', 'Z', 3);

    insert.run('category', 'J', 'J', 1);
    insert.run('category', 'W', 'W', 2);
  }
}
```

### 现有数据兼容

- `users` 表中的 `organization` 和 `category` 字段值无需改动
- 默认配置的 value 与原硬编码值一致，确保兼容

## 受影响文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/lib/db.ts` | 修改 | 新增表创建 + 初始化逻辑 |
| `src/lib/config-options.ts` | 新增 | 配置 CRUD 操作 |
| `src/app/actions/config-options.ts` | 新增 | Server Actions |
| `src/types/index.ts` | 修改 | 新增类型，移除硬编码类型 |
| `src/components/duty-users/DutyUserForm.tsx` | 修改 | 动态加载下拉选项 |
| `src/components/duty-users/DutyUserFilters.tsx` | 修改 | 动态加载筛选选项 |
| `src/components/DutyUserManagement.tsx` | 修改 | 传递配置数据给子组件 |
| `src/lib/imports/duty-users-template.ts` | 修改 | 动态生成模板下拉 |
| `src/lib/imports/duty-users-import.ts` | 修改 | 动态校验逻辑 |
| `src/app/dashboard/settings/page.tsx` | 修改 | 新增"字段配置" Tab |
| `src/components/settings/ConfigOptionsSection.tsx` | 新增 | 字段配置管理主组件 |
| `src/components/settings/ConfigOptionList.tsx` | 新增 | 配置列表组件 |
| `src/components/settings/ConfigOptionDialog.tsx` | 新增 | 新增/编辑弹窗组件 |

## 风险与注意事项

1. **向下兼容**：默认配置值与原硬编码值一致，确保平滑升级
2. **删除保护**：有关联人员的配置项不允许删除
3. **导入模板**：配置变更后，旧模板可能失效，需提示用户下载新模板
4. **性能**：配置项数量较少，无需额外优化

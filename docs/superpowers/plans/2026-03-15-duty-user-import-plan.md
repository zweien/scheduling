# 值班人员批量导入 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为值班人员管理页面增加 `.xlsx` 模板下载、导入前校验和按姓名更新/新增的批量导入能力。

**Architecture:** 在现有值班人员管理页中增加一个独立导入面板，服务端拆分为模板生成模块和导入解析模块，避免把 Excel 逻辑堆进 action。导入流程采用“下载模板 -> 上传预检 -> 校验通过后导入”，并统一由 `users` action 层做管理员权限校验与页面刷新。

**Tech Stack:** Next.js App Router、TypeScript、Server Actions、SQLite、ExcelJS、Playwright

---

## 文件结构

**Create:**
- `src/lib/imports/duty-users-template.ts`
- `src/lib/imports/duty-users-import.ts`
- `tests/duty-users-import.spec.ts`

**Modify:**
- `src/types/index.ts`
- `src/lib/users.ts`
- `src/app/actions/users.ts`
- `src/components/DutyUserManagement.tsx`

## Chunk 1: 模板与导入解析模块

### Task 1: 定义导入数据类型

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 先为导入结果补类型**

新增精简类型：

```ts
export type DutyUserImportRow = {
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  isActive: boolean;
  notes: string;
};

export type DutyUserImportIssue = {
  row: number;
  field: string;
  message: string;
};
```

- [ ] **Step 2: 定义预检结果类型**

```ts
export type DutyUserImportPreview = {
  totalRows: number;
  validRows: number;
  issues: DutyUserImportIssue[];
  rows: DutyUserImportRow[];
};
```

- [ ] **Step 3: 运行静态检查**

Run: `npx eslint "src/types/index.ts"`
Expected: PASS

### Task 2: 编写模板生成模块

**Files:**
- Create: `src/lib/imports/duty-users-template.ts`
- Reference: `src/lib/export/calendar-xlsx.ts`

- [ ] **Step 1: 写模板生成函数**

导出：

```ts
export async function buildDutyUsersTemplateWorkbook(): Promise<Buffer>
```

要求：
- 使用 `ExcelJS.Workbook`
- 单 sheet
- 第一行表头：
  - `姓名（必填）`
  - `所属单位（必填，W/X/Z）`
  - `人员类别（必填，J/W）`
  - `是否参与值班（必填，是/否）`
  - `备注（选填）`
- 第二行示例数据
- 表头加粗、底色、列宽可读

- [ ] **Step 2: 写最小模块验证思路**

在实现时保证返回 `Buffer`，不把 base64 和下载逻辑混入这个模块。

- [ ] **Step 3: 跑静态检查**

Run: `npx eslint "src/lib/imports/duty-users-template.ts"`
Expected: PASS

### Task 3: 编写导入解析模块

**Files:**
- Create: `src/lib/imports/duty-users-import.ts`
- Modify: `src/lib/users.ts`

- [ ] **Step 1: 先写失败用例目标**

需要支持：
- 表头校验
- 必填校验
- 枚举校验
- 文件内重复姓名校验
- 成功返回标准化行数据

- [ ] **Step 2: 写解析函数**

导出：

```ts
export async function previewDutyUsersImport(fileBuffer: Buffer): Promise<DutyUserImportPreview>
```

要求：
- 只读第一个 sheet
- 从第三行之后读取实际数据
- 空行跳过
- 返回结构化 `issues`

- [ ] **Step 3: 在 `src/lib/users.ts` 增加按姓名查找与 upsert 支持**

新增最小接口：

```ts
export function getUserByName(name: string)
export function createOrUpdateUserByName(input: ...)
```

要求：
- 同名存在则更新 `organization/category/is_active/notes`
- 不存在则新增

- [ ] **Step 4: 跑静态检查**

Run: `npx eslint "src/lib/imports/duty-users-import.ts" "src/lib/users.ts"`
Expected: PASS

## Chunk 2: Action 与页面交互

### Task 4: 扩展 users action

**Files:**
- Modify: `src/app/actions/users.ts`
- Reference: `src/app/actions/export.ts`

- [ ] **Step 1: 添加模板下载 action**

新增：

```ts
export async function downloadDutyUsersTemplate()
```

返回：

```ts
{
  fileName: string;
  mimeType: string;
  content: string;
}
```

- [ ] **Step 2: 添加导入预检 action**

新增：

```ts
export async function previewDutyUsersImportAction(fileBase64: string)
```

要求：
- `requireAdmin()`
- base64 转 `Buffer`
- 调用 `previewDutyUsersImport`

- [ ] **Step 3: 添加正式导入 action**

新增：

```ts
export async function importDutyUsersAction(fileBase64: string)
```

要求：
- 再做一次预检，不信任前端状态
- 若有 `issues` 直接返回失败
- 执行 upsert
- 返回新增数/更新数
- `revalidatePath('/dashboard/users')`
- 记录 `import_users` 日志

- [ ] **Step 4: 跑静态检查**

Run: `npx eslint "src/app/actions/users.ts"`
Expected: PASS

### Task 5: 在值班人员页增加导入面板

**Files:**
- Modify: `src/components/DutyUserManagement.tsx`

- [ ] **Step 1: 增加导入区状态**

需要至少包含：
- `selectedFile`
- `preview`
- `importError`
- `importing`
- `validating`

- [ ] **Step 2: 增加模板下载按钮**

调用 `downloadDutyUsersTemplate()`，复用现有二进制下载模式。

- [ ] **Step 3: 增加上传与预检**

上传 `.xlsx` 后：
- 转 base64
- 调用 `previewDutyUsersImportAction`
- 展示：
  - 总行数
  - 可导入数
  - 错误数
  - 错误明细

- [ ] **Step 4: 增加确认导入**

只有预检通过时允许点击“开始导入”。

导入成功后：
- 刷新列表
- 清空导入状态
- 显示新增数/更新数

- [ ] **Step 5: 跑静态检查**

Run: `npx eslint "src/components/DutyUserManagement.tsx"`
Expected: PASS

## Chunk 3: 回归测试

### Task 6: 增加浏览器回归

**Files:**
- Create: `tests/duty-users-import.spec.ts`

- [ ] **Step 1: 写模板下载验证**

验证值班人员页可看到“下载模板”按钮，并触发下载。

- [ ] **Step 2: 写非法文件预检失败用例**

构造错误模板内容，验证页面出现结构化错误提示。

- [ ] **Step 3: 写合法导入用例**

验证：
- 预检通过
- 导入成功
- 列表出现新人员

- [ ] **Step 4: 写同名更新用例**

验证同名导入后更新资料，而不是新增重复卡片。

- [ ] **Step 5: 运行相关回归**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_USERNAME=admin PLAYWRIGHT_PASSWORD=idrl123456 npx playwright test "tests/duty-users-import.spec.ts" "tests/duty-users-management.spec.ts" --reporter=line --workers=1
```

Expected: PASS

### Task 7: 最终静态检查

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/imports/duty-users-template.ts`
- Modify: `src/lib/imports/duty-users-import.ts`
- Modify: `src/lib/users.ts`
- Modify: `src/app/actions/users.ts`
- Modify: `src/components/DutyUserManagement.tsx`
- Test: `tests/duty-users-import.spec.ts`

- [ ] **Step 1: 运行 ESLint**

Run:

```bash
npx eslint "src/types/index.ts" "src/lib/imports/duty-users-template.ts" "src/lib/imports/duty-users-import.ts" "src/lib/users.ts" "src/app/actions/users.ts" "src/components/DutyUserManagement.tsx" "tests/duty-users-import.spec.ts"
```

Expected: PASS

- [ ] **Step 2: 记录结果，准备交付**

说明导入规则：
- 按姓名更新/新增
- 有任意错误则阻止导入
- 模板表头固定，不支持映射

# 阶段 3：数据库迁移机制版本化设计

## 目标

引入最小可用的版本化 migration 机制，替换 `src/lib/db.ts` 中分散的隐式 `ALTER TABLE ... try/catch` 初始化方式，同时保持当前表结构、业务行为和现有数据兼容。

## 现状问题

- `src/lib/db.ts` 同时承担连接、建表、迁移、默认配置、默认管理员初始化。
- 迁移逻辑依赖多段 `try/catch`，不可追踪、不可审计。
- release 驱动部署已经建立，数据库结构升级缺少明确版本边界。

## 设计原则

- KISS：不引入 ORM，不引入外部 migration CLI。
- YAGNI：不重写历史 schema，不拆成 SQL 文件体系。
- DRY：把 schema 变更和 seed 初始化职责拆开。
- SOLID：连接、迁移、种子初始化分模块。

## 设计方案

新增 `schema_migrations` 表，记录已执行 migration 的版本号。

新增模块：

- `src/lib/db/migrations.ts`
  - 定义 migration 列表
  - 按版本顺序执行
  - 每条 migration 幂等
- `src/lib/db/seed.ts`
  - 初始化默认配置
  - 初始化默认管理员

保留：

- `src/lib/db.ts`
  - 创建 SQLite 连接
  - 开启 WAL
  - 调用 migration runner
  - 调用 seed

## Migration 范围

使用累进式版本，而不是回溯重写：

- `001_initial_schema`
  - 创建核心表
- `002_users_profile_fields`
  - `users.organization`
  - `users.category`
  - `users.notes`
  - `users.is_active`
- `003_accounts_fields`
  - `accounts.role`
  - `accounts.is_active`
- `004_logs_audit_fields`
  - `logs.operator_username`
  - `logs.operator_role`
  - `logs.ip_address`
  - `logs.source`

## Seed 范围

- `config.password`
- `config.registration_enabled`
- 默认管理员 `admin`

这些 seed 在 schema 就绪后执行，并保持幂等。

## 不在本阶段处理

- 不引入独立 SQL migration 文件
- 不调整业务 schema
- 不修改页面行为
- 不修改导入/导出逻辑

## 验证

- `npm run lint`
- `npm run build`
- 新增 migration/seed 单测
- 回归：
  - 登录
  - 值班人员管理
  - 值班人员导入

## 预期结果

- 数据库结构变更具备版本记录
- 重复启动不会重复执行隐式迁移
- `db.ts` 职责明显收缩
- 后续 schema 变更可在可控边界内继续演进

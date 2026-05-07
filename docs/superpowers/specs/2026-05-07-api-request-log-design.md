# 所有 API 调用记录调用时间设计

## 背景

当前系统已经具备 API Token 鉴权和操作审计能力，但现有 API 日志只覆盖部分写操作，并且日志语义偏“业务变更”，例如：

- 替换值班成功
- 替换值班领导成功

这类日志可以回答“改了什么”，但不能完整回答“谁在什么时间调用了哪个 API，结果如何”。

新需求要求所有通过 API 的调用都记录调用时间，且成功与失败都要记录，便于对接 agent、排查调用问题和追踪外部系统行为。

## 目标

- 记录所有 `/api/*` 调用
- 成功和失败都记录，包括 `2xx`、`400`、`401`、`403`、`404`
- 调用时间直接落入现有日志体系
- 日志格式统一为“API 调用”，并包含 `方法 + 路径 + 状态码`
- 不影响现有业务日志能力

## 非目标

- 不新增独立审计表
- 不修改现有 `logs` 表结构
- 不记录完整请求体或响应体
- 不记录敏感 token 明文
- 不替代现有业务写日志，例如 `replace_schedule`

## 方案选择

### 方案 A：每个 API 路由手动写一条 `addApiLog`

优点：

- 改动直观
- 每个路由可单独定制日志内容

缺点：

- 重复代码多
- 失败分支容易漏记
- 后续新增 API 时容易忘记补日志

### 方案 B：新增统一 API 日志包装器

优点：

- 所有 API 路由统一记录
- 成功和失败口径一致
- 最不容易漏
- 路由层职责更清晰

缺点：

- 需要轻量调整现有 API route 写法

### 方案 C：用中间件统一拦截 `/api/*`

优点：

- 覆盖面最广

缺点：

- 中间件里拿鉴权上下文和最终业务语义更别扭
- 响应状态和错误码提取不如 route 层直接
- 容易把简单需求做复杂

### 结论

采用方案 B：新增统一 API 日志包装器。

原因：

- 这是横切关注点，应该统一收口
- 可最大限度减少重复代码，符合 DRY
- 不需要修改数据库结构，符合 KISS 和 YAGNI

## 日志语义设计

### 调用时间

本需求中的“调用时间”直接使用现有 `logs.created_at`。

说明：

- `created_at` 由日志写入时间自动生成
- 对于 API 调用日志，它天然就表示该次 API 调用发生的时间
- 因此不需要为“调用时间”新增独立字段

### 新增动作名

新增统一动作名：

- `api_request`

该动作名仅表示“发生了一次 API 调用”，不表示具体业务变更。

### 字段映射

统一使用现有 `logs` 表字段承载：

- `action`
  - 固定为 `api_request`
- `target`
  - 固定格式：`METHOD PATH STATUS`
  - 例如：
    - `GET /api/schedules 200`
    - `GET /api/schedules/monthly-markdown 400`
    - `PATCH /api/schedules/2026-03-16 403`
- `old_value`
  - 留空
- `new_value`
  - 简短结果摘要
  - 成功：`OK`
  - 失败：错误码，例如 `UNAUTHORIZED`、`INVALID_INPUT`、`FORBIDDEN`、`NOT_FOUND`
- `reason`
  - 留空
- `operator_username`
  - 有效 token：`token:<token-name>`
  - 无 token、无效 token、已禁用 token：`anonymous`
- `operator_role`
  - 有效 token：沿用 token 对应账号角色
  - 未认证失败：留空
- `ip_address`
  - 沿用现有请求头 IP 提取逻辑
- `source`
  - 固定为 `api`

## 与现有业务日志的关系

本次新增的 `api_request` 日志不替代现有业务日志。

例如管理员调用：

- `PATCH /api/schedules/2026-03-16`

调用成功后应保留两条日志：

1. 业务日志：
   - `replace_schedule`
   - 用于表达“哪一天值班人被改成了谁”
2. 调用日志：
   - `api_request`
   - 用于表达“谁在什么时间调用了哪个 API，结果是 200”

这样职责清晰：

- 业务日志回答“改了什么”
- 调用日志回答“调了什么接口”

## 覆盖范围

本次覆盖当前所有 `src/app/api/**/route.ts`：

- `GET /api/schedules`
- `GET /api/schedules/monthly-markdown`
- `PATCH /api/schedules/[date]`
- `GET /api/users`
- `GET /api/tokens`
- `POST /api/tokens`
- `PATCH /api/tokens/[id]`
- `GET /api/leaders`
- `GET /api/leader-schedules`
- `PATCH /api/leader-schedules/[date]`

后续新增 API 路由时，也必须接入统一包装器。

## 架构与职责拆分

### 1. API 日志包装层

建议新增文件：

- `src/lib/api-logging.ts`

职责：

- 包装 API route handler
- 在执行 handler 前尝试解析 token 上下文
- 执行 handler 并拿到最终响应
- 提取状态码和错误码
- 写入统一 `api_request` 日志
- 返回原始响应

边界：

- 不承载业务查询或业务修改逻辑
- 不拼接业务返回 JSON
- 不修改成功/失败响应格式

### 2. 日志写入层

复用并轻量扩展：

- `src/lib/logs.ts`

职责：

- 新增专门写 `api_request` 日志的辅助函数
- 统一拼接 `target` 与 `new_value`

边界：

- 不关心具体路由业务
- 不做请求参数校验

### 3. API route 层

现有各 `route.ts`

职责：

- 保留鉴权、参数校验、业务调用、响应封装
- 改为通过统一包装器执行

边界：

- 不再在每个 route 里手写重复的调用日志逻辑

## 数据流

单次 API 调用的执行顺序建议为：

1. 请求进入某个 `route.ts`
2. 统一包装器读取请求方法、路径、IP、token 上下文
3. 执行业务 handler
4. 拿到最终 `Response`
5. 从 `Response` 中提取状态码
6. 若响应体为标准错误 JSON，则提取错误码
7. 写入一条 `api_request` 日志
8. 返回原始响应给调用方

## 错误语义

所有结果都记日志，包括：

- `200`
- `201`
- `400`
- `401`
- `403`
- `404`
- 其他未来可能出现的 API 状态码

建议结果摘要规则：

- `2xx`：`OK`
- 标准错误 JSON：取 `error.code`
- 无法提取错误码时：使用 `HTTP_<status>`

示例：

- `GET /api/schedules 200` -> `new_value = OK`
- `GET /api/schedules 401` -> `new_value = UNAUTHORIZED`
- `GET /api/schedules/monthly-markdown 400` -> `new_value = INVALID_INPUT`

## 测试策略

### API 集成测试

优先在现有 API Playwright 测试中增加覆盖：

1. 查询接口成功后写入一条 `api_request`
2. `monthly-markdown` 成功后写入一条 `api_request`
3. 未带 token 的 `401` 也写入一条 `api_request`
4. 参数错误的 `400` 也写入一条 `api_request`
5. 写接口调用成功后：
   - 原有业务日志仍存在
   - 同时多出一条 `api_request`

### 纯函数或辅助函数测试

如果包装器或日志摘要拼接逻辑足够集中，可补轻量测试覆盖：

- `target` 格式是否正确
- `2xx -> OK`
- 错误 JSON -> `error.code`
- 非标准错误响应 -> `HTTP_<status>`

## 风险与控制

### 风险 1：日志量明显增加

风险：

- 所有 API 成功和失败都记录后，日志增长速度会上升

控制：

- 首版不额外记录请求体和响应体
- 只保留最小必要字段，避免日志膨胀

### 风险 2：重复日志语义混淆

风险：

- 写接口既有业务日志，又有调用日志，用户可能误以为重复

控制：

- 明确区分动作名：
  - 业务日志：`replace_schedule` 等
  - 调用日志：`api_request`

### 风险 3：部分失败分支被漏记

风险：

- 如果日志逻辑散落在各个 route 内，失败路径容易遗漏

控制：

- 使用统一包装器收口
- 让成功与失败日志都在包装器出口统一写入

## 验收标准

1. 所有现有 `/api/*` 路由都会记录一条 `api_request` 日志
2. 成功和失败调用都记录
3. `logs.created_at` 可直接作为 API 调用时间展示
4. 日志 `target` 采用 `METHOD PATH STATUS` 格式
5. 日志 `new_value` 能表达 `OK` 或错误码
6. 现有业务日志能力不受影响
7. 现有 API 响应契约不变

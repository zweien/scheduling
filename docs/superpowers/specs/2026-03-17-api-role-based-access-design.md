# 外部 API 按角色区分查询与修改能力设计

## 背景

当前系统已经提供外部 API 能力，但 API Token 仅校验“是否有效”，没有绑定创建者账号，也没有把账号角色带入鉴权。结果是普通用户和管理员在 API 层没有读写区分，无法与页面权限保持一致。

本次需求希望做到：

- 普通用户只能通过 API 查询
- 管理员可以通过 API 查询和修改
- 普通用户也可以创建并管理自己的 API Token

## 目标

- API Token 绑定创建者账号
- API 读接口对所有有效 token 开放
- API 写接口仅管理员 token 可用
- 登录用户可以创建、查看、禁用自己名下的 token
- 页面权限和 API 权限保持一致

## 非目标

- 不实现管理员查看或管理所有用户 token 的后台
- 不引入更细粒度的自定义 token 权限配置
- 不修改现有页面角色体系

## 方案

### Token 与账号绑定

为 `api_tokens` 增加 `account_id` 字段，记录 token 的创建者账号。

新创建 token 时必须写入 `account_id`。后续 API 鉴权以 token 关联账号的角色为准，而不是仅根据 token 是否存在。

### 权限模型

普通用户：

- 可以创建、查看、禁用自己名下的 token
- 可以访问查询类 API
- 不可以访问写类 API

管理员：

- 可以创建、查看、禁用自己名下的 token
- 可以访问查询类和写类 API

说明：首版不做“管理员管理所有用户 token”，避免超出需求范围。

### 鉴权上下文

当前 `src/lib/api-auth.ts` 只返回 token 记录，不足以完成角色判断。

改造后，认证逻辑返回统一的 API 上下文，至少包含：

- token 信息
- 账号信息
- 账号角色

在此基础上提供两层能力：

- 认证：验证 token 是否存在、未禁用、关联账号有效
- 授权：判断当前 token 是否允许执行写操作

### 接口范围

查询接口：

- `GET /api/schedules`
- `GET /api/users`

对所有有效 token 开放。

写接口：

- `PATCH /api/schedules/[date]`

仅管理员 token 可访问。

token 管理接口：

- `GET /api/tokens`
- `POST /api/tokens`
- `PATCH /api/tokens/[id]`

改为所有登录用户可用，但只能操作自己名下的 token。

## 旧 token 兼容策略

为避免历史版本已发出的 token 立即失效，首版采用温和兼容：

- 新 schema 增加 `account_id`
- 新创建 token 必须绑定账号
- 历史 token 如果缺少 `account_id`，运行时按“管理员历史 token”兼容

这样可以保证已发出的集成凭证不会因为升级直接中断。后续如果需要收紧策略，再单独做历史 token 清理。

## 错误语义

- 未携带 token、token 无效、token 已禁用：返回 `401`
- token 有效但角色无权写入：返回 `403`
- 用户尝试操作不属于自己的 token：返回 `404`

对他人 token 返回 `404`，可以避免额外暴露资源存在性。

## 日志

成功的 API 写操作继续记录 `token:<name>` 来源日志。

权限不足的写操作不记录成功日志，避免伪造审计结果。

## 测试

### 迁移与数据层

- 验证 `api_tokens` 新增 `account_id`
- 验证新 token 会写入创建者账号
- 验证旧 token 缺少 `account_id` 时仍可兼容认证

### API 集成测试

- 普通用户 token 可以查询排班和人员
- 普通用户 token 调用写接口返回 `403`
- 管理员 token 可以调用写接口
- 普通用户登录后可以创建、查看、禁用自己的 token
- 普通用户不能禁用其他账号的 token

### 审计回归

- 管理员 token 写操作成功后写入 API 来源日志
- 普通用户写操作被拒绝时不产生成功写日志

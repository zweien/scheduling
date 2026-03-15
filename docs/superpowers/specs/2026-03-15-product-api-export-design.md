# 值班排班系统产品化升级设计

## 背景

当前项目已经具备排班、查看、统计、导出等核心能力，但在以下方面仍然偏“内部工具原型”：

- README 表达偏基础，缺少成熟开源项目的产品化呈现
- 登录页信息层级和视觉表现较弱
- 缺少可供外部系统集成的 RESTful API
- 导出能力仅支持 CSV/JSON，不适合直接打印的月历风格 Excel

本次设计目标是在不引入额外后端服务的前提下，基于现有 Next.js + SQLite 架构完成产品化增强。

## 目标

本次升级覆盖四项能力：

1. 重构 README，提升为现代化 GitHub 项目首页风格，并加入系统截图
2. 美化登录页面，保持现有登录流程不变
3. 新增带 Bearer Token 鉴权的 RESTful API，用于查询和修改排班
4. 新增月历风格 XLSX 导出，支持打印场景

## 非目标

以下内容不在本次范围内：

- 引入独立 API 服务或微服务
- 引入复杂权限系统、角色系统、组织隔离
- 引入 token 过期、刷新 token、OAuth 等复杂认证机制
- 批量排班修改接口
- 删除 token 的完整生命周期管理
- 替换现有 CSV/JSON 导出能力

## 方案选择

采用单仓库内增量扩展方案：

- README 在现有仓库内直接重写
- 登录页在现有前端基础上升级
- API 使用 Next.js App Router 的 `route.ts`
- Token 使用 SQLite 持久化，服务端仅保存哈希
- XLSX 导出复用现有导出入口，新增工作簿构建模块

选择该方案的原因：

- 复用现有会话、数据库、排班逻辑，符合 KISS
- 不引入额外部署复杂度，符合 YAGNI
- Web、API、导出共享同一套领域逻辑，避免重复实现，符合 DRY

## 架构总览

本次升级在现有项目内拆分为四个模块：

### 1. 品牌与展示层

职责：

- 重写 README
- 组织和引用系统截图
- 提升项目对外展示质量

边界：

- 不承载实现细节
- 不重复文档化数据库结构和内部代码流程

### 2. 登录页展示层

职责：

- 升级登录入口页视觉风格
- 增强标题层级、品牌说明、错误提示与加载反馈

边界：

- 不改变现有登录协议
- 不替换现有 Server Action 登录流程

### 3. API 能力层

职责：

- 对外提供查询和修改排班的 RESTful API
- 提供 token 的创建、查看、禁用能力

边界：

- API route 只做参数校验、鉴权、返回 JSON
- 实际业务逻辑继续下沉到 `src/lib`
- API 不直接依赖 UI 组件或页面逻辑

### 4. 导出能力层

职责：

- 保留 CSV/JSON 导出
- 增加月历风格 XLSX 导出

边界：

- Excel 布局与生成逻辑独立封装
- 不把工作簿生成代码直接堆到 action 中

## 模块边界与文件职责

### README 与截图

- `README.md`
  - 项目主页型文档
- `docs/screenshots/`
  - README 使用的系统截图资源

### 登录页

- `src/components/LoginForm.tsx`
  - 登录表单与页面视觉主结构
- 如有必要可新增：
  - `src/components/LoginFeatureList.tsx`
  - `src/components/LoginHero.tsx`

### API 与 Token

- `src/app/api/schedules/route.ts`
  - 排班查询接口
- `src/app/api/schedules/[date]/route.ts`
  - 指定日期排班修改接口
- `src/app/api/users/route.ts`
  - 人员查询接口
- `src/app/api/tokens/route.ts`
  - token 列表与创建接口
- `src/app/api/tokens/[id]/route.ts`
  - token 禁用接口
- `src/lib/api-tokens.ts`
  - token 创建、哈希、校验、查询、禁用
- `src/lib/api-auth.ts`
  - Bearer Token 提取与认证入口

### 导出

- `src/app/actions/export.ts`
  - 导出入口，增加 XLSX 分支
- `src/lib/export/calendar-xlsx.ts`
  - 月历工作簿生成器
- `src/components/ExportDialog.tsx`
  - 增加 XLSX 导出选项

## REST API 设计

### 认证方式

采用 Bearer Token：

- 请求头：`Authorization: Bearer <token>`
- token 由系统生成
- 明文 token 仅在创建成功时返回一次
- 数据库仅保存哈希值与元数据

### Token 数据模型

建议新增 `api_tokens` 表，字段包括：

- `id`
- `name`
- `token_hash`
- `token_prefix`
- `created_at`
- `last_used_at`
- `disabled_at`

说明：

- `token_prefix` 用于管理界面识别，不暴露完整 token
- `disabled_at` 非空表示已禁用
- 不保存明文 token，降低泄漏风险

### API 列表

#### 1. 查询排班

`GET /api/schedules?start=YYYY-MM-DD&end=YYYY-MM-DD`

行为：

- 查询指定日期范围内的排班
- 返回日期、用户、是否手动调整等信息

响应示例：

```json
[
  {
    "date": "2026-03-16",
    "isManual": false,
    "user": {
      "id": 14,
      "name": "张三",
      "isActive": true
    }
  }
]
```

#### 2. 修改指定日期排班

`PATCH /api/schedules/:date`

请求体：

```json
{
  "userId": 14
}
```

行为：

- 按日期替换值班人
- 复用现有排班修改逻辑
- 写入操作日志

#### 3. 查询人员

`GET /api/users`

行为：

- 返回人员列表
- 默认包含 `is_active`

#### 4. 创建 token

`POST /api/tokens`

前置条件：

- 必须是已登录 Web 管理端发起

请求体：

```json
{
  "name": "integration-bot"
}
```

响应示例：

```json
{
  "id": 1,
  "name": "integration-bot",
  "token": "sch_xxxxxxxxxxxxxxxxxxxx",
  "prefix": "sch_xxxx"
}
```

#### 5. 获取 token 列表

`GET /api/tokens`

行为：

- 仅返回 token 元数据
- 不返回明文 token

#### 6. 禁用 token

`PATCH /api/tokens/:id`

请求体：

```json
{
  "disabled": true
}
```

### 鉴权与错误处理

认证失败返回：

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or disabled token"
  }
}
```

约定：

- `400` 参数错误
- `401` 鉴权失败
- `404` 资源不存在
- `409` 业务冲突
- `500` 服务端错误

所有 API 返回 JSON，不返回 HTML。

## 登录页设计

### 设计目标

- 让系统第一屏更像成熟内部产品，而不是默认表单页
- 保持现有功能和提交流程不变
- 同时兼顾桌面端与移动端

### 设计方向

建议采用带品牌说明的单卡或双区布局：

- 左侧或顶部为品牌说明、系统卖点、使用场景
- 右侧或下方为登录表单
- 使用更明确的标题、副标题、说明文案
- 增强背景层次、边框、阴影与留白
- 错误态与加载态更清晰

### 交互要求

- 保持密码输入 + 登录按钮的最小闭环
- 登录失败时错误提示明显但不刺眼
- 提交过程中按钮进入 loading 状态
- 移动端布局自动收敛为单列

## README 设计

### 目标风格

参考成熟 GitHub 项目主页风格，而不是传统课程作业式 README。

### 推荐结构

1. Hero 标题与一句话价值主张
2. 功能亮点
3. 系统截图
4. 快速开始
5. 使用流程
6. REST API 简介
7. 导出能力说明
8. 技术栈
9. 项目结构
10. 未来计划
11. 许可证

### 截图策略

从已有资源中筛选 4 到 6 张：

- 登录页
- Dashboard 主界面
- 月历视图
- 统计页
- 导出或移动端截图

要求：

- 路径稳定
- 图片名称清晰
- README 中按价值链而不是文件顺序展示

## XLSX 导出设计

### 输出目标

生成适合打印的月历工作簿：

- 每个月一个 sheet
- 每张 sheet 为月历布局
- 一周七列
- 按周展开

### 单元格内容

每个日期单元格显示：

- 日期
- 值班人姓名
- 手动调整标记（如需要可用简短标识）

### 打印要求

- 适配 A4 横向打印
- 设置打印区域
- 设置页边距
- 设置列宽、行高、文本换行
- 标题和星期行样式清晰

### 实现要求

- 保留现有 CSV/JSON 导出
- 新增 XLSX 选项
- Excel 生成逻辑独立封装
- 不应产生公式错误

### 数据来源

继续使用现有排班数据查询逻辑：

- 指定开始和结束日期
- 按月拆分为多个 sheet
- 同一数据源支持 CSV、JSON、XLSX 三种输出

## 测试策略

### API

- token 创建、查询、禁用
- Bearer Token 鉴权成功/失败
- 查询排班接口参数校验
- 修改排班接口行为与日志写入

### 登录页

- 登录成功与失败路径不回退
- loading 与错误提示正常
- 响应式布局不破坏可用性

### XLSX 导出

- 文件可生成
- workbook 中 sheet 数量正确
- 月历网格结构正确
- 日期和值班人写入正确

### README

- 图片路径有效
- 链接路径有效
- API 示例与实际接口一致

## 风险与对策

### 1. API 与现有 Server Action 重复

对策：

- 统一下沉到 `src/lib`
- Server Action 与 API 共享领域函数

### 2. Token 明文泄漏风险

对策：

- 仅创建时显示一次
- 服务端只保存哈希

### 3. XLSX 布局代码膨胀

对策：

- 建立专门的导出模块
- 将 sheet 构建逻辑与 action 分离

### 4. README 过度营销化

对策：

- 保持专业、准确、可验证
- 用真实截图和真实能力，不夸大

## 实施顺序

按以下顺序推进：

1. README 与登录页品牌升级
2. REST API 与 Token 管理
3. XLSX 月历导出

这样可以先统一产品基调，再稳定数据入口，最后构建导出能力。

# 按月返回 Markdown 值班月历 API 设计

## 背景

当前系统已经提供 `GET /api/schedules?start=YYYY-MM-DD&end=YYYY-MM-DD` 的排班查询接口，返回格式为 JSON，适合集成程序消费。

新需求希望 API 能直接返回某个月的值班表，并以 Markdown 月历表格形式输出，便于在文档、知识库、IM 机器人或工单系统中直接粘贴展示。

## 目标

- 新增独立 API，按月返回值班月历
- 响应体直接输出 Markdown 文本
- 月历结构固定为周一到周日 7 列表格
- 复用现有 Bearer Token 鉴权与排班查询逻辑

## 非目标

- 不修改现有 `GET /api/schedules` 的 JSON 契约
- 不支持通过同一接口切换 JSON/Markdown 多种格式
- 不在单元格中输出“手动调整”等扩展状态
- 不新增导出页面、下载按钮或 UI 配置项
- 不支持跨月合并输出

## 方案选择

### 方案 A：新增 `GET /api/schedules/monthly-markdown?month=YYYY-MM`

优点：

- 与现有 `schedules` 资源域保持一致
- 不影响现有 `start/end` 查询接口
- 路径语义明确，同时表达“按月”和“Markdown”

缺点：

- 路径稍长，但可读性更好

### 方案 B：新增 `GET /api/schedules/markdown?month=YYYY-MM`

优点：

- 路径更短

缺点：

- 只强调输出格式，没有强调“按月月历”的语义

### 方案 C：新增 `GET /api/monthly-schedules?month=YYYY-MM`

优点：

- 独立性更强

缺点：

- 与现有 `schedules` API 结构不一致

### 结论

采用方案 A：`GET /api/schedules/monthly-markdown?month=YYYY-MM`

原因：

- 最符合当前项目 API 结构
- 最小改动即可满足需求，符合 KISS
- 避免重做已有接口契约，符合 YAGNI

## 接口设计

### 路径与方法

`GET /api/schedules/monthly-markdown?month=YYYY-MM`

### 认证方式

沿用现有 Bearer Token：

- 请求头：`Authorization: Bearer <token>`
- 无 token、token 无效或已禁用时返回 `401`

### 请求参数

- `month`
  - 必填
  - 格式固定为 `YYYY-MM`
  - 例如：`2026-03`

### 成功响应

- 状态码：`200 OK`
- `Content-Type: text/markdown; charset=utf-8`
- 响应体：Markdown 月历文本

示例：

```md
# 2026年3月值班表

| 周一 | 周二 | 周三 | 周四 | 周五 | 周六 | 周日 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  | 1 张三 | 2 李四 |
| 3 王五 | 4 赵六 | 5 | 6 张三 | 7 | 8 | 9 李四 |
```

### 错误响应

继续沿用现有 API 错误 JSON 结构：

- 缺少 `month`：`400 INVALID_INPUT`
- `month` 格式非法：`400 INVALID_INPUT`
- Bearer Token 无效：`401 UNAUTHORIZED`

## Markdown 月历规则

### 标题

固定为：

`# YYYY年M月值班表`

示例：

`# 2026年3月值班表`

### 表头

固定为 7 列，从周一到周日：

- `周一`
- `周二`
- `周三`
- `周四`
- `周五`
- `周六`
- `周日`

### 单元格内容

单元格只保留最小信息量：

- 有排班：`D 姓名`
- 无排班但属于当月：`D`
- 不属于当月补位：空字符串

示例：

- `16 张三`
- `17`
- 空白

说明：

- 不显示“手动调整”
- 不显示用户 ID
- 不显示换行、列表或多段文本

这样可以减少 Markdown 渲染差异，保持输出稳定。

### 周起始规则

月历按周一作为每周起始，与现有 XLSX 月历导出逻辑保持一致。

### 空白补位

首周和末周需要补齐为完整 7 列：

- 月初前置空白日期输出为空单元格
- 月末后置空白日期输出为空单元格

## 架构与职责拆分

### 1. API 路由层

文件：

- `src/app/api/schedules/monthly-markdown/route.ts`

职责：

- Bearer Token 鉴权
- `month` 参数校验
- 计算该月起止日期
- 调用排班查询
- 调用 Markdown 构建器
- 返回 `text/markdown`

边界：

- 不直接拼接 Markdown 细节
- 不承载日期网格生成逻辑

### 2. Markdown 构建层

文件：

- `src/lib/export/calendar-markdown.ts`

职责：

- 根据月份生成月历网格
- 将 `ScheduleWithUser[]` 渲染为 Markdown 表格
- 封装标题、表头、行内容输出规则

边界：

- 不做鉴权
- 不依赖 `NextRequest` 或 `NextResponse`
- 不直接访问数据库

### 3. 现有排班数据层

复用：

- `src/lib/schedules.ts`

职责保持不变：

- 按日期范围返回排班数据

这样可以避免重复查询逻辑，符合 DRY。

## 数据流

请求进入后按以下顺序执行：

1. API 路由读取 `Authorization` 和 `month`
2. 认证 Bearer Token
3. 校验 `month=YYYY-MM`
4. 将 `month` 转换为当月第一天和最后一天
5. 调用 `getSchedulesByDateRange(start, end)`
6. 将排班数据传入 Markdown 构建器
7. 返回 Markdown 文本

## 测试策略

### API 集成测试

在 `tests/api-schedules.spec.ts` 增加覆盖：

1. 无 Token 请求返回 `401`
2. 合法 Token + 合法 `month` 返回 `200`
3. 成功响应 `content-type` 为 `text/markdown`
4. 响应正文包含标题、表头、日期和姓名
5. 缺少 `month` 返回 `400`
6. 非法 `month` 返回 `400`

### 构建器测试

如果当前仓库已有适合的纯函数测试位置，可补充针对 Markdown 构建器的轻量测试，验证：

- 周一到周日表头顺序正确
- 月初和月末补位正确
- 有排班与无排班单元格格式正确

若首版希望控制改动最小，可先只做 API 集成测试，由集成测试覆盖主路径。

## 风险与控制

### 风险 1：`month` 解析歧义

风险：

- `new Date('2026-03')` 在不同运行时可能存在解析差异

控制：

- 显式校验 `YYYY-MM`
- 在实现中手动拼接为稳定日期字符串，例如当月第一天

### 风险 2：Markdown 表格在不同平台渲染差异

风险：

- 多行内容、额外标记、复杂嵌套在部分平台渲染不稳定

控制：

- 单元格只输出单行文本
- 不加入换行和富格式内容

### 风险 3：接口职责膨胀

风险：

- 若直接在 route 中拼接月历文本，后续难维护

控制：

- 将 Markdown 生成逻辑独立到 `src/lib/export/calendar-markdown.ts`
- 保持 API 层只负责参数、鉴权和响应

## 验收标准

1. 新增 `GET /api/schedules/monthly-markdown?month=YYYY-MM`
2. 合法 Bearer Token 可获取指定月份 Markdown 月历
3. 返回 `Content-Type: text/markdown; charset=utf-8`
4. 月历表格按周一到周日固定 7 列输出
5. 单元格仅显示 `日期` 或 `日期 + 姓名`
6. 缺少或非法 `month` 返回 `400`
7. 不影响现有 `/api/schedules` JSON 查询接口

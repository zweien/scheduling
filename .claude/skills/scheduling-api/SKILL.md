---
name: scheduling-api
description: Operate the 值班排班系统 (duty-scheduling system) through its REST API — query who is on duty, swap/change a day's assignment, get duty statistics (with holiday breakdown), export the monthly roster. Use whenever the user wants to interact with the scheduling/值班/排班 system from the terminal, e.g. "查一下本周谁值班", "把下周三的值班换成张三", "统计今年每个人值班几次", "导出本月值班表", "今年节假日值班情况", or mentions scheduling.zweien.xyz / the scheduling repo / 值班表 / 调班 / 换班. Auth and base URL are handled by the bundled scripts/api.sh helper reading .env.
---

# scheduling-api — 值班系统 API 操作

This skill lets you drive the duty-scheduling system (`zweien/scheduling`) from the command line: query rosters, change who's on duty, pull statistics, export schedules. All calls go through one helper that injects auth, so you never handle the token by hand.

## 前置条件（一次性）

The API requires a **Bearer token**. Tokens are created from the **web UI** (login → 设置/Token 管理 → 新建), not via the API itself — `POST /api/tokens` needs a login session, so do it once in the browser.

Put the token in the repo root `.env` (this file is gitignored, so it stays local):

```bash
# .env  （从 skill 的 assets/env.example 复制后填写）
SCHEDULING_API_TOKEN=sch_xxxxxxxxxxxxxxxxxxxxxxxx
SCHEDULING_BASE_URL=http://localhost:3000   # 开发；线上用 https://scheduling.zweien.xyz
```

If `.env` is missing or the token is empty, the helper prints a clear error.

**Token role matters:** query/stats/export work with any token; **changing duty (`PATCH ...`) requires an admin token.** A non-admin token gets `403 FORBIDDEN`.

## 如何调用

Use the bundled helper — it loads `.env`, adds the `Authorization: Bearer …` header, and appends an `HTTP_STATUS:NNN` line to the output so you can tell success from failure:

```bash
bash .claude/skills/scheduling-api/scripts/api.sh METHOD "/path" 'optional-json-body'
```

Always run from the repo root (that's where `.env` lives). Parse the trailing `HTTP_STATUS:` line: `200` = OK, `400` = bad input, `401` = token missing/invalid, `403` = token lacks admin role.

## 能力清单

### 查询（GET，任意 token）

```bash
# 某段时间的值班（返回每天的值班人）
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/schedules?start=2026-07-01&end=2026-07-31"

# 全部值班人员
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/users"

# 领导值班 / 领导列表
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/leader-schedules?start=2026-07-01&end=2026-07-31"
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/leaders"
```

### 换班 / 改排班（PATCH，需 admin token）

把某一天的值班人换成指定 userId（改后该天标记为手动调整 `isManual:true`，自动排班会保留）：

```bash
bash .claude/skills/scheduling-api/scripts/api.sh PATCH "/api/schedules/2026-07-15" '{"userId":3}'
# 领导值班同理：
bash .claude/skills/scheduling-api/scripts/api.sh PATCH "/api/leader-schedules/2026-07-15" '{"leaderId":2}'
```

要换班时先 `GET /api/users` 拿到 `userId`/`name` 对应关系，再 PATCH 目标日期。日期格式 `YYYY-MM-DD`。

### 统计（GET，任意 token）— `/api/schedules/stats`

时间参数三选一：`year`、`month`（`YYYY-MM`）、或 `start`+`end`。

```bash
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/schedules/stats?year=2026"
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/schedules/stats?month=2026-07"
```

返回 `{range,total,userCount,stats[]}`，每人含值班次数及节假日维度分类。字段含义（用户常问，解释清楚）：

| 字段 | 含义 |
|---|---|
| `count` | 区间内值班天数 |
| `restDayCount` | 非工作日值班（法定节假日 + 周末 − 调休补班） |
| `holidayCount` | **法定节假日**值班天数（如元旦、春节） |
| `adjustedWorkdayCount` | **调休补班**值班天数——周末被官方定为工作日的那天 |
| `restDays` | 非工作日明细：`type=holiday`（带 `name`）或 `weekend` |

> 跨度上限 10 年；超过返回 400。节假日按年自动拉取（NateScarlet/holiday-cn），失败回退到内置 2025–2026。

### 导出（GET，任意 token）

```bash
# 当月值班表 Markdown
bash .claude/skills/scheduling-api/scripts/api.sh GET "/api/schedules/monthly-markdown?month=2026-07"
```

### Token 管理

`GET/POST/PATCH /api/tokens` 走**登录 session**（不是 Bearer），因此不通过本助手创建/列出。如需新 token：浏览器登录 → Token 管理页。

## 实用模式

- **"谁本周值班"** → 算出本周一~周日的 `YYYY-MM-DD`，`GET /api/schedules?start=…&end=…`，按 `user.name` 汇总。
- **"把 X 换成 Y"** → 先 `GET /api/users` 找到 Y 的 `userId`，再 `PATCH /api/schedules/<date>`；可用 `GET /api/schedules?start=<date>&end=<date>` 复核。
- **"今年谁值班最多 / 节假日值班几次"** → `GET /api/schedules/stats?year=<年>`，看 `count` 排序与 `holidayCount`。
- 结果是 JSON 时，用 `jq` 等工具格式化更易读（如 `… | jq .`）。

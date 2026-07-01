#!/usr/bin/env bash
# scheduling-api 助手：用 .env 里的 Bearer token 调用值班系统 REST API。
# 用法: api.sh METHOD path [json-body]
# 示例: api.sh GET "/api/schedules/stats?year=2026"
#       api.sh PATCH "/api/schedules/2026-07-15" '{"userId":3}'
set -euo pipefail

# 从本脚本位置向上查找最近的 .env（仓库根目录）
d="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [ "$d" != "/" ] && [ ! -f "$d/.env" ]; do d="$(dirname "$d")"; done
if [ -f "$d/.env" ]; then set -a; . "$d/.env"; set +a; fi

: "${SCHEDULING_BASE_URL:=http://localhost:3000}"

if [ -z "${SCHEDULING_API_TOKEN:-}" ]; then
  echo "ERROR: SCHEDULING_API_TOKEN 未设置。请在仓库根目录的 .env 中配置（见 skill 的 assets/env.example）。" >&2
  exit 2
fi

METHOD="${1:?用法: api.sh METHOD path [json-body]}"
PATH_="${2:?用法: api.sh METHOD path [json-body]}"
BODY="${3:-}"

extra=()
if [ -n "$BODY" ]; then
  extra=(-H "Content-Type: application/json" -d "$BODY")
fi

# -sS 静默但报错；末尾追加 HTTP_STATUS 行便于解析
exec curl -sS -X "$METHOD" "$SCHEDULING_BASE_URL$PATH_" \
  -H "Authorization: Bearer $SCHEDULING_API_TOKEN" \
  "${extra[@]}" \
  -w '\nHTTP_STATUS:%{http_code}\n'

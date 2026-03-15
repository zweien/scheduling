#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/scheduling}"
APP_USER="${APP_USER:-$USER}"
REPO_URL="${REPO_URL:-git@github.com:zweien/scheduling.git}"
NODE_MAJOR="${NODE_MAJOR:-20}"
APP_HOME="$(getent passwd "${APP_USER}" | cut -d: -f6)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令: $1" >&2
    exit 1
  fi
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local installed_major
    installed_major="$(node -p 'process.versions.node.split(".")[0]')"

    if [ "${installed_major}" -ge "${NODE_MAJOR}" ]; then
      return
    fi
  fi

  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get update
  sudo apt-get install -y nodejs
}

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return
  fi

  sudo npm install -g pm2
}

ensure_repo() {
  if [ -d "${APP_DIR}/.git" ]; then
    return
  fi

  git clone "${REPO_URL}" "${APP_DIR}"
}

write_env_template() {
  local env_file="${APP_DIR}/.env.production"

  if [ -f "${env_file}" ]; then
    return
  fi

  cat >"${env_file}" <<'EOF'
NODE_ENV=production
S_PORT=3018
SESSION_SECRET=replace-with-a-random-string-at-least-32-characters
EOF
}

main() {
  require_command curl
  require_command git

  ensure_node
  require_command npm

  ensure_pm2

  sudo mkdir -p "${APP_DIR}" "${APP_DIR}/logs"
  sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

  ensure_repo
  write_env_template

  cd "${APP_DIR}"
  npm ci

  sudo env "PATH=${PATH}" pm2 startup systemd -u "${APP_USER}" --hp "${APP_HOME}"
  pm2 save

  cat <<EOF
初始化完成。

下一步：
1. 编辑 ${APP_DIR}/.env.production
2. 将部署公钥加入服务器用户的 ~/.ssh/authorized_keys
3. 手动配置 Nginx 反代到 127.0.0.1:3018
4. 首次部署时执行：
   cd "${APP_DIR}" && set -a && source ./.env.production && set +a && npm run build && pm2 startOrReload ecosystem.config.js --env production && pm2 save
EOF
}

main "$@"

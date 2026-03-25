# GitHub Actions 部署到 VPS Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前 Next.js + SQLite 项目建立基于 GitHub Actions、SSH、PM2 和 Nginx 的 VPS 自动部署链路。

**Architecture:** 仓库内新增 VPS 初始化脚本、PM2 配置、GitHub Actions workflow 和部署文档。部署目录通过 SSH 登录后执行 `git fetch + reset + npm ci + build + pm2 reload`，应用运行在 `127.0.0.1:3018`，由 Nginx 反向代理。

**Tech Stack:** Next.js 16, Node.js, PM2, GitHub Actions, SSH, Nginx

---

## 文件结构映射

**安全与运行配置**

- Modify: `src/lib/session.ts`
- Create: `ecosystem.config.js`

**部署脚本**

- Create: `scripts/deploy/init-vps.sh`

**CI/CD**

- Create: `.github/workflows/deploy-vps.yml`

**文档**

- Create: `docs/deployment/vps.md`

## Chunk 1: 生产安全约束

### Task 1: 生产环境强制要求 `SESSION_SECRET`

**Files:**
- Modify: `src/lib/session.ts`
- Create: `tests/session-config.spec.ts`

- [ ] **Step 1: 写失败测试，验证生产环境缺失 `SESSION_SECRET` 时应失败**

Test behavior:

```ts
it('throws when NODE_ENV is production and SESSION_SECRET is missing')
it('allows fallback only in non-production environments')
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx playwright test tests/session-config.spec.ts --reporter=line --workers=1
```

Expected: 当前实现会回退默认值，因此测试失败。

- [ ] **Step 3: 修改 `src/lib/session.ts`**

Requirements:
- 非生产环境允许回退默认值
- 生产环境下缺失 `SESSION_SECRET` 时直接抛错

- [ ] **Step 4: 重跑测试**

Run:

```bash
npx playwright test tests/session-config.spec.ts --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 5: 提交**

```bash
git add src/lib/session.ts tests/session-config.spec.ts
git commit -m "fix(deploy): require session secret in production"
```

## Chunk 2: VPS 初始化与进程托管

### Task 2: 添加 PM2 运行配置

**Files:**
- Create: `ecosystem.config.js`

- [ ] **Step 1: 定义 PM2 配置草案**

Requirements:
- app name 使用稳定名称，如 `scheduling`
- 默认监听 `S_PORT=3018`
- 工作目录指向部署目录
- 启动命令使用 `npm run start -- --hostname 127.0.0.1 --port $S_PORT`
- 输出日志到 `logs/`

- [ ] **Step 2: 校验配置文件语法**

Run:

```bash
node -e "const config=require('./ecosystem.config.js'); console.log(config.apps[0].name)"
```

Expected: 输出应用名且命令执行成功。

- [ ] **Step 3: 提交**

```bash
git add ecosystem.config.js
git commit -m "chore(deploy): add pm2 ecosystem config"
```

### Task 3: 添加 VPS 初始化脚本

**Files:**
- Create: `scripts/deploy/init-vps.sh`

- [ ] **Step 1: 编写初始化脚本失败用例思路并做脚本接口设计**

Script responsibilities:
- 检查 `git`
- 检查 `node`
- 检查 `npm`
- 安装或检查 `pm2`
- 创建 `/var/www/scheduling` 与日志目录
- 输出后续 `.env.production` 操作提示
- 执行 `pm2 startup`

- [ ] **Step 2: 实现初始化脚本**

Requirements:
- 使用 `bash`
- 可重复执行
- 参数化应用目录
- 对缺失命令给出明确报错

- [ ] **Step 3: 本地做静态校验**

Run:

```bash
bash -n scripts/deploy/init-vps.sh
```

Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add scripts/deploy/init-vps.sh
git commit -m "chore(deploy): add VPS initialization script"
```

## Chunk 3: GitHub Actions 自动部署

### Task 4: 添加 GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy-vps.yml`

- [ ] **Step 1: 设计 workflow 输入与触发条件**

Requirements:
- `master` push 触发
- 使用 Secrets:
  - `VPS_HOST`
  - `VPS_USER`
  - `VPS_SSH_KEY`
  - `VPS_PORT`
  - `VPS_APP_DIR`

- [ ] **Step 2: 实现 workflow**

Deployment steps:

```bash
cd "$VPS_APP_DIR"
git fetch --all
git reset --hard origin/master
npm ci
npm run build
pm2 startOrReload ecosystem.config.js --env production
pm2 save
```

Requirements:
- 配置 SSH key
- 写入 known_hosts
- 使用非交互 SSH
- 在命令失败时直接退出

- [ ] **Step 3: 校验 workflow YAML**

Run:

```bash
python - <<'PY'
import yaml, pathlib
path = pathlib.Path('.github/workflows/deploy-vps.yml')
print(yaml.safe_load(path.read_text())['name'])
PY
```

Expected: 能解析 YAML 并输出 workflow 名称。

- [ ] **Step 4: 提交**

```bash
git add .github/workflows/deploy-vps.yml
git commit -m "ci: add GitHub Actions VPS deployment workflow"
```

## Chunk 4: 部署文档

### Task 5: 编写 VPS 部署说明文档

**Files:**
- Create: `docs/deployment/vps.md`

- [ ] **Step 1: 编写首次部署流程**

Include:
- VPS 需要安装什么
- 如何运行 `init-vps.sh`
- 如何准备 `.env.production`
- 如何 clone 仓库到部署目录

- [ ] **Step 2: 编写 GitHub Secrets 清单**

Include:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT`
- `VPS_APP_DIR`

- [ ] **Step 3: 编写 Nginx 配置示例**

Requirements:
- 反代到 `127.0.0.1:3018`
- 包含常见代理头
- 明确需要用户自己启用

- [ ] **Step 4: 编写回滚与排障说明**

Include:
- 查看 pm2 日志
- 手动回滚到指定 commit
- 检查 `SESSION_SECRET`
- 检查 `S_PORT`

- [ ] **Step 5: 提交**

```bash
git add docs/deployment/vps.md
git commit -m "docs(deploy): add VPS deployment guide"
```

## Chunk 5: 最终验证

### Task 6: 验证部署资产完整性

**Files:**
- Verify only

- [ ] **Step 1: 运行脚本与配置静态检查**

Run:

```bash
bash -n scripts/deploy/init-vps.sh
node -e "const config=require('./ecosystem.config.js'); console.log(config.apps[0].env_production.S_PORT)"
python - <<'PY'
import yaml, pathlib
print(yaml.safe_load(pathlib.Path('.github/workflows/deploy-vps.yml').read_text())['on'])
PY
```

Expected: 全部成功输出。

- [ ] **Step 2: 运行项目核心回归测试**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_PASSWORD=123456 npx playwright test "tests/login-page.spec.ts" "tests/statistics-navigation.spec.ts" "tests/api-schedules.spec.ts" "tests/api-tokens.spec.ts" "tests/export-xlsx.spec.ts" "tests/token-dialog.spec.ts" --reporter=line --workers=1
```

Expected: 通过。

- [ ] **Step 3: 提交最终集成变更**

```bash
git add src/lib/session.ts ecosystem.config.js scripts/deploy/init-vps.sh .github/workflows/deploy-vps.yml docs/deployment/vps.md tests/session-config.spec.ts
git commit -m "feat(deploy): add GitHub Actions VPS deployment flow"
```

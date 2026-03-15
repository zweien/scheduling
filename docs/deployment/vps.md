# VPS 部署说明

本文档说明如何通过 GitHub Actions 将项目部署到自有 VPS，运行方式为 `Node.js + PM2 + Nginx`。

## 部署架构

- GitHub 作为代码源
- GitHub Actions 负责触发部署
- VPS 上使用 `pm2` 托管 `next start`
- `nginx` 反向代理到 `127.0.0.1:3018`
- SQLite 数据库存放在 VPS 本地磁盘

## 前置条件

- Ubuntu 或 Debian 系统
- 可登录的部署用户
- 已安装 `git` 与 `curl`
- GitHub 仓库已配置好 `origin`

## 第一次初始化 VPS

在服务器上执行：

```bash
git clone git@github.com:zweien/scheduling.git /opt/scheduling
cd /opt/scheduling
bash "scripts/deploy/init-vps.sh"
```

脚本会完成以下工作：

- 安装 Node.js 20
- 安装 `pm2`
- 创建 `/opt/scheduling/logs`
- 生成 `.env.production` 模板
- 注册 `pm2 startup`

### 生产环境变量

编辑 `/opt/scheduling/.env.production`：

```env
NODE_ENV=production
S_PORT=3018
SESSION_SECRET=replace-with-a-random-string-at-least-32-characters
```

说明：

- `S_PORT` 是应用监听端口，默认 `3018`
- `SESSION_SECRET` 在生产环境必填，缺失时应用会直接启动失败

## 配置 GitHub Actions Secrets

在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中添加：

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`
- `VPS_PORT`

建议值：

- `VPS_APP_DIR=/opt/scheduling`
- `VPS_PORT=22`

## 配置部署 SSH Key

本地生成专用部署密钥：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions-scheduling
```

将公钥追加到 VPS 部署用户的 `~/.ssh/authorized_keys`：

```bash
cat ~/.ssh/github-actions-scheduling.pub
```

将私钥内容写入 GitHub Secret `VPS_SSH_KEY`。

## 首次启动应用

在 VPS 上执行：

```bash
cd /opt/scheduling
npm ci --include=dev
set -a
source ./.env.production
set +a
npm run build
pm2 startOrReload ecosystem.config.js --env production
pm2 save
```

查看状态：

```bash
pm2 status
pm2 logs scheduling
```

## GitHub Actions 自动部署流程

当 `master` 分支收到新的 push 时，workflow 会：

1. 通过 SSH 登录 VPS
2. 进入部署目录
3. 执行 `git fetch --all`
4. 执行 `git reset --hard origin/master`
5. 执行 `npm ci --include=dev`
6. 加载 `.env.production`
7. 执行 `npm run build`
8. 执行 `pm2 startOrReload ecosystem.config.js --env production`
9. 执行 `pm2 save`

这个流程假设 VPS 部署目录只用于部署，不在服务器上直接修改代码。

## Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.example.com;

    location / {
        proxy_pass http://127.0.0.1:3018;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

完成后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 回滚

如果最新部署有问题，可在 VPS 上手动回滚到上一个提交：

```bash
cd /opt/scheduling
git log --oneline -n 5
git reset --hard <commit>
npm ci --include=dev
set -a
source ./.env.production
set +a
npm run build
pm2 startOrReload ecosystem.config.js --env production
pm2 save
```

## 常见问题

### 应用无法启动

优先检查：

- `.env.production` 是否存在
- `SESSION_SECRET` 是否配置
- `pm2 logs scheduling` 是否有端口占用或构建错误

### GitHub Actions 无法 SSH

优先检查：

- `VPS_SSH_KEY` 是否为完整私钥
- 公钥是否已写入 `authorized_keys`
- `VPS_USER`、`VPS_HOST`、`VPS_PORT` 是否正确

### 数据未持久化

SQLite 使用本地文件存储，请确保：

- `data/` 目录在 VPS 上可写
- 部署用户对项目目录有写权限
- 备份策略覆盖 `data/scheduling.db`

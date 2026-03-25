# GitHub Actions 部署到 VPS 设计

## 背景

当前项目已经具备完整的 Web、API 与导出能力，但尚未建立正式部署链路。由于项目依赖本地 SQLite 文件，且需要可写持久化环境，不适合部署到 Vercel 这类 Serverless 平台。

本次设计目标是：

- 使用 GitHub Actions 自动部署到个人 VPS
- 使用 Node.js + PM2 + Nginx 的轻量部署方式
- 保持资源占用尽可能低
- 不引入 Docker

## 目标

本次部署方案需要覆盖：

1. VPS 初始化脚本
2. PM2 运行配置
3. GitHub Actions 自动部署 workflow
4. VPS 部署文档
5. 生产环境必要的安全约束

## 非目标

以下内容不在本次范围内：

- Docker / Docker Compose 部署
- Terraform / Ansible
- 自动下发和修改 Nginx 配置
- 多机部署
- 蓝绿发布
- 自动数据库迁移框架

## 方案选择

采用方案 A：

- 仓库内提供 VPS 初始化脚本
- 仓库内提供 PM2 配置
- 仓库内提供 GitHub Actions workflow
- Nginx 配置只提供文档示例，不由 CI 自动改系统配置

选择原因：

- 风险更低
- 资源占用更低
- 适合 Next.js + SQLite + 单 VPS 的部署模式
- 避免 CI 误改 VPS 上其它站点的 Nginx 配置

## 架构总览

部署后的结构：

- GitHub 仓库：代码源
- GitHub Actions：触发自动部署
- VPS：实际运行环境
- PM2：进程托管与重启
- Nginx：对外反向代理
- SQLite：本地持久化数据

请求链路：

`Browser -> Nginx -> 127.0.0.1:3018 -> Next.js app`

## 运行方式

### 应用端口

- 默认端口：`3018`
- 环境变量名：`S_PORT`

### PM2 启动方式

构建：

```bash
npm ci
npm run build
```

启动：

```bash
npm run start -- --hostname 127.0.0.1 --port 3018
```

实际由 PM2 读取 `S_PORT` 启动。

### 运行目录

建议：

- 应用目录：`/var/www/scheduling`
- 日志目录：`/var/www/scheduling/logs`

### 数据目录

继续使用：

- `data/scheduling.db`

该目录在 VPS 上本地持久化。

## 环境变量

最小生产环境变量：

- `NODE_ENV=production`
- `SESSION_SECRET=<强随机字符串>`
- `S_PORT=3018`

### 安全要求

生产环境缺少 `SESSION_SECRET` 时，应用应直接启动失败，而不是回退到默认值。

这是必要的生产安全修正。

## 仓库内新增文件

### 1. VPS 初始化脚本

路径：

- `scripts/deploy/init-vps.sh`

职责：

- 检查 `git`、`node`、`npm`
- 检查或安装 `pm2`
- 创建应用目录与日志目录
- 输出 `.env.production` 准备提示
- 注册 `pm2 startup`

说明：

- 该脚本用于首次上机初始化
- 不负责 Nginx 自动配置

### 2. PM2 配置

路径：

- `ecosystem.config.js`

职责：

- 定义应用名
- 定义运行命令
- 定义工作目录
- 定义日志路径
- 读取 `S_PORT`

### 3. GitHub Actions workflow

路径：

- `.github/workflows/deploy-vps.yml`

职责：

- 在 `master` push 后触发
- 配置 SSH
- 登录 VPS
- 执行标准部署命令

### 4. 部署文档

路径：

- `docs/deployment/vps.md`

职责：

- 记录首次初始化步骤
- 记录 GitHub Secrets
- 记录 Nginx 配置示例
- 记录回滚与故障排查

## GitHub Secrets 设计

建议使用以下 Secrets：

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT`
- `VPS_APP_DIR`

推荐值：

- `VPS_APP_DIR=/var/www/scheduling`

## GitHub Actions 工作流

推荐部署步骤：

1. `actions/checkout`
2. 写入 SSH 私钥
3. 写入 `known_hosts`
4. SSH 到 VPS
5. 在 VPS 执行：

```bash
cd "$VPS_APP_DIR"
git fetch --all
git reset --hard origin/master
npm ci
npm run build
pm2 startOrReload ecosystem.config.js --env production
pm2 save
```

### 为什么不用 `git pull`

使用：

```bash
git fetch --all
git reset --hard origin/master
```

而不是 `git pull`，原因是：

- 对 CI 更稳定
- 不会因服务器上残留改动导致失败
- 更符合“部署目录不手工改代码”的约束

前提是：

- VPS 上的应用目录专门用于部署
- 不在服务器上直接编辑应用源码

## Nginx 设计

本次不自动修改 Nginx，但文档需提供示例配置。

推荐反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

## 回滚策略

最小回滚策略：

- 在 VPS 上手动回退到指定提交
- 执行：

```bash
git reset --hard <commit>
npm ci
npm run build
pm2 restart scheduling
```

文档中应明确这一流程。

## 风险与对策

### 1. VPS 缺少基础环境

对策：

- 提供初始化脚本
- 文档明确前置条件

### 2. `SESSION_SECRET` 配置错误

对策：

- 生产环境强制校验
- 缺失时启动失败

### 3. SQLite 权限问题

对策：

- 文档明确应用目录与写权限要求
- 确保 `data/` 可写

### 4. Actions 可 SSH 但部署目录未初始化

对策：

- workflow 文档要求先跑初始化脚本
- 若目录不存在，脚本应明确失败原因

### 5. Nginx 转发错误

对策：

- 提供可直接复制的 Nginx 示例配置
- 不在 CI 中自动变更系统配置

## 实施顺序

按以下顺序推进：

1. 增加生产环境 `SESSION_SECRET` 安全校验
2. 编写 VPS 初始化脚本
3. 编写 PM2 配置
4. 编写 GitHub Actions workflow
5. 编写 VPS 部署文档
6. 做本地静态验证与流程校验

# 值班排班系统

一个为小团队（5-10人）设计的内部值班管理系统，支持自动排班、手动调整、统计分析和操作日志。

## 功能特性

- **自动排班** - 按人员顺序循环分配值班日期
- **手动调整** - 支持替換（点击选择）和交换（拖拽）值班
- **日历视图** - 月历形式展示，直观查看值班安排
- **列表视图** - 按日期列表展示值班信息
- **统计分析** - 查看值班次数统计和人员对比
- **操作日志** - 记录所有操作变更历史
- **人员管理** - 支持添加、删除和排序人员
- **暗色模式** - 支持亮色/暗色主题切换
- **导出功能** - 支持 CSV/JSON 格式导出
- **响应式设计** - 适配桌面和移动设备

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: SQLite + better-sqlite3
- **认证**: iron-session
- **拖拽**: @dnd-kit
- **日期**: date-fns

## 快速开始

### 环境要求

- Node.js 18+
- Bun / npm / yarn / pnpm

### 安装

```bash
# 克隆仓库
git clone https://github.com/zweien/scheduling.git
cd scheduling

# 安装依赖
bun install
# 或
npm install
```

### 配置

创建 `.env.local` 文件（可选）：

```env
SESSION_SECRET=your-secret-key-at-least-32-characters
```

### 运行

```bash
# 开发模式
bun dev
# 或
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问应用。

默认密码：`123456`

### 构建

```bash
bun run build
bun start
```

## 使用说明

1. **登录** - 使用团队共享密码登录
2. **添加人员** - 在左侧面板添加值班人员
3. **生成排班** - 选择月份后点击生成按钮
4. **调整排班** - 点击日历单元格替换值班人员，或拖拽交换
5. **查看统计** - 点击统计按钮查看值班次数分析
6. **导出数据** - 点击导出按钮导出 CSV 或 JSON 格式

## 项目结构

```
src/
├── app/
│   ├── actions/     # Server Actions
│   ├── dashboard/   # 主界面
│   └── page.tsx     # 登录页
├── components/
│   ├── ui/          # shadcn/ui 组件
│   └── *.tsx        # 业务组件
├── lib/
│   ├── db.ts        # 数据库连接
│   ├── session.ts   # Session 配置
│   └── *.ts         # 业务逻辑
└── types/           # TypeScript 类型
```

## License

MIT

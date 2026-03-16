# 阶段 4：发布流程完善设计

## 目标

把当前已经切换到 release 驱动部署的流程补成一个可执行、可回滚、可重复的发布规范，避免“workflow 已改，团队流程仍靠记忆”的状态。

## 范围

本阶段只处理发布流程文档和 GitHub Release 模板化，不修改业务代码，不再改 VPS 部署脚本。

包含：

- 版本号规则
- tag / release 发布步骤
- GitHub Release Notes 分类配置
- 回滚说明
- 部署文档同步到 release 驱动模型

不包含：

- 不改数据库结构
- 不改页面功能
- 不增加新的 CI/CD job

## 设计原则

- KISS：只补当前已经在使用的发布路径
- YAGNI：不引入复杂语义化发布工具
- DRY：把发布说明收口到固定文档，不让 README、部署文档、口头约定互相冲突

## 设计方案

### 1. 版本号规则

采用 `v<major>.<minor>.<patch>`：

- `patch`：修复、文档、部署流程、小范围兼容修正
- `minor`：新增功能、对外能力增强
- `major`：不兼容变更

### 2. 发布文档

新增独立发布文档，例如：

- `docs/deployment/releases.md`

内容包括：

- 发布前检查
- 打 tag
- 创建 GitHub Release
- 验证 Actions 与 VPS 部署
- 回滚到上一个 release tag

### 3. Release Notes 模板

新增：

- `.github/release.yml`

用于 `gh release create --generate-notes` 和 GitHub 自动生成 release notes 的分类控制。

建议分类：

- 功能
- 修复
- 文档与运维

### 4. 部署文档同步

更新 `docs/deployment/vps.md`：

- 从“push master 自动部署”改成“发布 release 触发部署”
- 增加 `workflow_dispatch` 手动按 tag 部署说明
- 回滚说明改成以 tag 为中心，而不是只写 commit

## 验证

- `.github/release.yml` 语法可读
- `docs/deployment/vps.md` 与当前 workflow 一致
- 发布文档路径明确，能直接照着执行

## 预期结果

- 发布动作有清晰 SOP
- Release Notes 有稳定结构
- 发布与回滚依赖 tag，而不是临时记忆
- 当前 release 驱动部署链路在文档层面闭环

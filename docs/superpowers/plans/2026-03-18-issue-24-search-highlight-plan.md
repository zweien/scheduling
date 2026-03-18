# Issue #24 第三期计划：值班人员管理页搜索高亮

1. 梳理现有搜索与列表渲染链路
   - 检查 [src/components/DutyUserManagement.tsx](/home/z/scheduling/src/components/DutyUserManagement.tsx) 中 `filters.search` 的流转
   - 检查 [src/components/duty-users/DutyUserList.tsx](/home/z/scheduling/src/components/duty-users/DutyUserList.tsx) 中姓名渲染位置

2. 先补测试，锁定高亮行为
   - 增加输入搜索词后姓名命中片段高亮的 Playwright 用例
   - 增加清空搜索后高亮消失的用例
   - 增加空格输入不触发误高亮的用例

3. 新增轻量展示组件
   - 新增 `HighlightedText` 小组件
   - 只负责文本切分与高亮渲染，不承担筛选逻辑

4. 集成到值班人员管理页
   - 在 [src/components/duty-users/DutyUserList.tsx](/home/z/scheduling/src/components/duty-users/DutyUserList.tsx) 接入高亮组件
   - 继续复用现有 `filters.search`
   - 保持现有排序、编辑、启停、删除交互不变

5. 回归验证
   - 运行新增 Playwright 用例
   - 回归值班人员管理页相关测试
   - 运行 `npm run lint`

6. 收尾
   - 检查 worktree 中是否有无关改动
   - 汇总 `#24` 三期已完成内容，准备后续合并

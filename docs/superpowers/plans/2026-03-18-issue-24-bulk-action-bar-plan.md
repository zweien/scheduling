# Issue #24 第一期计划：月历多选底部浮动操作栏

1. 梳理现有月历多选与导出链路
   - 确认 [src/components/CalendarView.tsx](/home/z/scheduling/src/components/CalendarView.tsx) 的 `selectedDates`、批量删除入口和顶部多选操作区
   - 确认现有导出 action 与导出 workbook 构建逻辑能否复用

2. 先补测试，锁定新增行为
   - 增加底部浮动操作栏出现与消失的 Playwright 用例
   - 增加批量编辑成功回归
   - 增加导出已选只包含选中日期的 Node / action 测试

3. 新增批量编辑 action
   - 在 [src/app/actions/schedule.ts](/home/z/scheduling/src/app/actions/schedule.ts) 增加批量替换入口
   - 在底层排班逻辑中确保只更新选中日期
   - 写入单独的批量替换日志

4. 新增已选日期导出 action
   - 新增按离散日期导出 `XLSX` 的 action
   - 复用现有导出 workbook 构建逻辑，避免重复实现

5. 新增底部浮动操作栏组件
   - 新增 [src/components/SelectedSchedulesActionBar.tsx](/home/z/scheduling/src/components/SelectedSchedulesActionBar.tsx)
   - 只负责展示数量与动作按钮，不承担业务逻辑

6. 集成到月历视图
   - 在 [src/components/CalendarView.tsx](/home/z/scheduling/src/components/CalendarView.tsx) 接入浮动栏
   - 保留顶部“全选当月 / 取消选择”
   - 将真正的批量动作收敛到底部浮动栏
   - 接入批量编辑弹窗和导出动作

7. 回归验证
   - 运行新增 Node 测试
   - 运行相关 Playwright 用例
   - 运行 `npm run lint`

8. 收尾
   - 检查 worktree 中是否有无关改动
   - 汇总本期已完成范围和未覆盖项

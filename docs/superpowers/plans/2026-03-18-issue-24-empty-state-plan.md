# Issue #24 第二期计划：无排班月份空状态引导

1. 梳理现有无排班展示与生成入口
   - 检查 [src/components/CalendarView.tsx](/home/z/scheduling/src/components/CalendarView.tsx) 当前在无排班月份时的表现
   - 检查 [src/components/ListView.tsx](/home/z/scheduling/src/components/ListView.tsx) 当前空状态文案
   - 确认现有“生成排班”入口最合适的触发方式

2. 先补测试，锁定空状态引导行为
   - 增加月历视图无排班时显示空状态的 Playwright 用例
   - 增加列表视图无排班时显示统一空状态的 Playwright 用例
   - 增加点击“去生成排班”后可见现有生成入口的回归

3. 新增统一空状态组件
   - 新增 [src/components/EmptyScheduleState.tsx](/home/z/scheduling/src/components/EmptyScheduleState.tsx)
   - 只负责展示标题、说明和按钮，不耦合具体业务逻辑

4. 集成到月历视图
   - 在 [src/components/CalendarView.tsx](/home/z/scheduling/src/components/CalendarView.tsx) 中判断当前可见月份是否无排班
   - 无排班时显示空状态组件
   - 接通“去生成排班”动作

5. 集成到列表视图
   - 用统一空状态组件替换现有简单虚线框提示
   - 维持列表视图其余逻辑不变

6. 回归验证
   - 运行新增 Playwright 用例
   - 回归视图切换与现有排班页面基础测试
   - 运行 `npm run lint`

7. 收尾
   - 检查 worktree 中是否有无关改动
   - 汇总本期已覆盖范围与后续仍未完成的 `#24` 子项

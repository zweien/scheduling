# Issue #25 无障碍首版改进计划

1. 盘点公共组件与高频入口
   - 检查 [src/components/ui/dialog.tsx](/home/z/scheduling/src/components/ui/dialog.tsx) 的关闭按钮文案与默认行为
   - 检查 [src/components/Header.tsx](/home/z/scheduling/src/components/Header.tsx) 中图标按钮、移动端菜单和视图切换的语义缺口
   - 检查 [src/components/CalendarContextMenu.tsx](/home/z/scheduling/src/components/CalendarContextMenu.tsx) 的菜单语义与键盘关闭行为

2. 先补测试，锁定首版无障碍回归点
   - 增加弹窗 `Esc` 关闭与焦点回退测试
   - 增加移动端更多菜单状态属性测试
   - 增加月历右键菜单 `Esc` 关闭测试

3. 改造公共弹窗组件
   - 将通用关闭按钮隐藏文本统一改为中文
   - 将 footer 默认关闭按钮文案统一为中文
   - 保持现有 Base UI 焦点管理能力，不重写弹窗实现

4. 改造 Header 的高频交互控件
   - 为侧边栏按钮、主题切换、月历/列表切换补可访问名称
   - 为移动端更多菜单补 `aria-expanded`、`aria-controls`
   - 确保图标按钮在桌面端和移动端都能被读屏正确识别

5. 改造月历右键菜单的基础可操作性
   - 打开时将焦点移入菜单
   - 支持 `Esc` 关闭
   - 关闭后将焦点返回触发元素
   - 保持现有鼠标交互不变，不扩展到方向键导航

6. 执行回归验证
   - 运行新增的 Playwright 用例
   - 运行相关高频页面已有回归
   - 运行 `npm run lint`

7. 收尾并准备提交流程
   - 复核是否存在无关改动
   - 汇总本次首版覆盖范围与明确未覆盖项

# 信号库（Signals）

> 按 `norms/signals.md` 维护：可加权、可衰减、可证伪的指令式微知识；创建/加分/退役在 review 写回步骤执行。

## SGN-1 · tsc/vitest/pnpm 随机 SIGSEGV（exit 139）先查 swap 水位与失控进程再重试
- 方向: positive
- 权重: 2
- 深度: runtime
- 域/scope: 本机工具链 · 验证执行
- 证据: 20261007-style-scrollbars-virtual-projects-list（swap 9.2G 用 8.7G 时连 pnpm/wait-on 二进制本身都段错误；清理失控 dev 实例后一次重试全过）；renderer-virtual-list 卡「本机注意」同源
- 命中: 2（最近 2026-10-08）
- 退役条件: 换机或内存常态余量 >50% 且连续一个月无复现

## SGN-2 · 后台化 `next dev` 必须挂持久 stdin（`< /dev/zero`），裸 nohup/& 必静默自杀
- 方向: negative
- 权重: 1
- 深度: runtime
- 域/scope: Next 16 dev server · apps/desktop 启动
- 证据: 20261007-style-scrollbars-virtual-projects-list（nohup/pnpm exec 裸启三次 2~15s 内退出码 0 零输出，误判为缓存损坏/端口占用各排查一轮；`< /dev/zero` 后 460ms Ready）
- 命中: 1（最近 2026-10-08）
- 退役条件: Next 移除 stdin-EOF 防孤儿退出机制（升级后实测一次）

## SGN-3 · release/branch 写操作前先 `git branch --show-current` + `git status`，确认无并行会话共享工作树
- 方向: positive
- 权重: 1
- 深度: field
- 域/scope: shadow-dev 发布流程 · 多会话并行
- 证据: 20261007-style-scrollbars-virtual-projects-list（release plan 首轮自动绑到另一会话未提交的 feature 分支，若不复核会把两条线混进同一 PR；切回 main + branch execute 后正常）
- 命中: 1（最近 2026-10-08）
- 退役条件: shadow-dev CLI 自身在 plan 阶段拒绝非本 change 分支（升级后验证）

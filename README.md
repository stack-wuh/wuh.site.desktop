# wuh.site.desktop

wuh.site 项目的桌面端管理器 —— 通用 Markdown 编辑器，深度集成 GitHub。

独立仓库，以 git 子模块形式嵌入 [x.wuh.site](https://github.com/stack-wuh/x.wuh.site)（`apps/desktop`），与 `apps/blog` 同模式：不并入 pnpm workspace，依赖独立安装。

## 功能

- **通用 Markdown 编辑**：CodeMirror 6 源码模式 + 实时预览（本地图片相对路径可直接渲染）
- **图片粘贴/拖拽**：自动写入文档同目录的同名 `.assets` 文件夹，插入相对链接（blog 约定）
- **图床上传适配器**：可配置自定义上传命令（`{file}` 占位 / 末尾追加路径），从 stdout 提取 URL 替换链接
- **文件历史与快速回退**（git 增强，工作区为 git 仓库时自动解锁）：
  - 手动 commit + 可选防抖自动 commit
  - push / pull / 分支与 ahead-behind 状态
  - 单文件/全仓 log + diff 查看
  - 回退语义：未 push 的改动 checkout 恢复；已 push 的提交 revert 新提交抵消，禁止改写远端历史
- **GitHub 集成**（PAT 直连，作用域 = 当前仓库）：
  - Issues 发布：frontmatter 的 title/labels 驱动，同标题自动更新；blog 预设自动注入 `wuh-site-metadata` 尾注
  - 标签管理：labels 列表 / 新建 / 更新 / 删除
  - 评论管理：issue 评论浏览与回复
- **结构化识别**：目录约定规则引擎，blog 内置预设（`{YYYY}/{YYYY-MM}` 年月目录、`$专题`、同名 `.assets`），命中后文件树自动切换为 年份/月份/专题 分组视图
- **多平台预留**：publisher 适配器接口（`src/main/publishers/types.ts`），微信公众号 / Notion / 知乎 后置实现

## 开发

```bash
# 首次（子模块模式，在 x.wuh.site 根目录）
git submodule update --init apps/desktop

# 依赖安装（在 apps/desktop 内独立安装，不并入 workspace）
pnpm install --ignore-workspace

pnpm dev          # 开发模式
pnpm test         # vitest 单元测试
pnpm typecheck    # tsc 双侧类型检查
pnpm dist:mac     # 本地打包（dist/mac/*.app）
```

> 本机 Node 高负载下偶发段错误时，可加 `NODE_OPTIONS=--max-old-space-size=6144` 重试。

## 安全

- GitHub PAT 通过 Electron `safeStorage` 加密后存系统钥匙串，不落明文
- 渲染进程 `contextIsolation` 开启，全部 fs/git/网络操作收敛在主进程
- git push 凭证走 `x-access-token` 内存注入，不写入仓库配置

## 架构

```
src/
├── shared/       # 主/渲染进程共享：IPC 契约 + 纯逻辑（frontmatter/imagePlan/structure/revert）
├── main/         # 主进程：workspace/images/git/gitRevert/credentials/github/uploader/publishers
├── preload/      # contextBridge：window.api（类型安全 IPC）
└── renderer/     # React UI：FileTree / CodeMirror / Preview / Frontmatter / Git / GitHub / Settings
```

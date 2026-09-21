# wuh.site.desktop

wuh.site 项目的桌面端 —— **插件化壳层（两栏布局）+ 沙箱插件宿主**，主进程提供 fs / git / GitHub / 图片等本地能力，界面由内置与第三方插件填充。

独立仓库，以 git 子模块形式嵌入 [x.wuh.site](https://github.com/stack-wuh/x.wuh.site)（`apps/desktop`）。**2026-09-21 起并入父仓库 pnpm workspace**（依赖随根锁文件统一管理，工具链与 `apps/site` 对齐：Next.js + styled-components + oxlint 风格）。

## 技术栈

- **渲染层**：Next.js 16 App Router（`output: 'export'` 静态导出）——`app/(shell)/` 持久化两栏壳层（左栏 SideMenu + 右栏 main 容器 + 预留通知条 + 状态栏），路由段 `/`、`/settings`、`/plugin/<pluginId>/<viewId>`
- **样式**：styled-components（SWC 编译）+ `:root` CSS 变量主题 token（酒红/素雅 × 浅色/深色，`data-theme-family` / `data-color-scheme` 属性路由）
- **壳层进程**：Electron 主进程 + preload（`contextIsolation` 开启，fs/git/网络全部收敛在主进程）；生产由自定义 `app://` 协议离线加载静态导出产物
- **插件系统**：manifest 声明制（`views.area: main | float`、权限白名单、statusItems）+ `plugin://` 沙箱帧（`sandbox="allow-scripts"` 不透明源 + MessagePort 帧协议）

## 内置插件（官方参考实现）

| 插件 | 区域 | 能力 |
|------|------|------|
| Frontmatter 助手 | main | 文档 frontmatter 编辑（title/labels 等） |
| Git 历史与回退 | main | 单文件/全仓 log、diff、非破坏性回退 |
| GitHub Issues | main | Issues 发布/更新、标签与评论管理（PAT 直连） |
| Markdown 预览 | float 浮窗 | markdown-it 渲染 + 相对图片 `local-resource://` 重写 |

插件入口：内置 `plugins/`（随包分发）与 `userData/plugins/`（第三方）；启停、权限批准、重载均在设置页「插件」区块。

## 开发

```bash
# 首次（子模块模式，在 x.wuh.site 根目录）
git submodule update --init apps/desktop
pnpm install                       # 依赖随父仓库 workspace 统一安装

cd apps/desktop
pnpm dev          # 双进程：next dev(3000) + electron-vite watch(main/preload)
pnpm test         # vitest 单元测试
pnpm typecheck    # tsc 双侧（node 侧 + tsconfig.next.json）
pnpm build        # next build（静态导出 dist/next）+ electron-vite build（out/）
pnpm dist         # 生产打包（electron-builder --dir，含 app:// 产物）
pnpm dist:mac     # macOS .app
```

> 本机 Node 高负载下偶发段错误时，可加 `NODE_OPTIONS=--max-old-space-size=6144` 重试。
> 打包机若访问 GitHub 受限，electron/electron-builder 资源可走 `ELECTRON_MIRROR` / `ELECTRON_BUILDER_MIRROR` 指向 npmmirror。

## 安全

- GitHub PAT 通过 Electron `safeStorage` 加密后存系统钥匙串，不落明文
- 插件运行于 `sandbox="allow-scripts"` 不透明源帧：无 preload、无宿主 DOM，能力调用按 manifest 权限经主进程 broker 裁决
- CSP 由 `app/layout.tsx` meta 承载（`frame-src plugin:` 放行沙箱帧；生产不含 `unsafe-eval`）
- git push 凭证走 `x-access-token` 内存注入，不写入仓库配置

## 架构

```
app/                  # Next App Router（路由段 + 静态导出入口）
├── (shell)/          # 两栏壳层 layout（SideMenu + main 容器 + 预留通知条 + StatusBar）
│   ├── page.tsx      # 首页（活动热力图）
│   ├── settings/     # 设置页（Token / 站点服务 / Git 身份 / 插件管理）
│   └── plugin/[...slug]/   # 插件 main 视图（构建期枚举内置 manifest）
├── layout.tsx        # 根布局（CSP meta + ThemeProvider + 版本内联）
└── globals.css       # 字体 / 基座 / 滚动条 / 品牌动效（组件样式一律 styled-components）

components/           # renderer 组件（壳层 chrome、UI 原语、插件帧宿主、页面）
lib/                  # 渲染层纯逻辑（floats / statusItems / renderPipeline / store / routes）
src/shared/           # 主/渲染共享：IPC 与插件契约 + 纯逻辑（frontmatter/imagePlan/structure/revert/url）
src/main/             # 主进程：workspace/images/git/gitRevert/credentials/github/uploader/publishers + 插件 loader/broker
src/preload/          # contextBridge：window.api / window.pluginApi
src/plugin-sdk/       # 插件侧 SDK（wuh.* 能力与状态栏 API）
plugins/              # 内置官方参考插件（manifest + 沙箱帧入口）
```

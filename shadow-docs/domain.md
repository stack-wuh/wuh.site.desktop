# wuh.site.desktop 上下文地图

> 登记 `apps/desktop` 的限界上下文归属、上下游、主目录与项目术语。实现过程留在 change brief，不写进本图；知识卡 `domain:` 取值只能来自本表登记名。

| 限界上下文 | 职责 | 上下游 | 主目录或模块 | 关键术语 |
|---|---|---|---|---|
| main-process | Electron 宿主进程：窗口与自定义协议、IPC 装配、工作区与文件 IO、草稿仓、Git/GitHub、凭证、图片与图床、发布桥、系统通知 | 上游：操作系统 / Electron / Git / GitHub / OSS；下游：renderer-ui、plugin | `src/main/`（`plugins/` 除外）、`src/preload/`、`src/shared/` | 工作区 / 最近项目 / 草稿 / 文档迁移 / 发布通道 / 图床 / 会话白名单 / 凭证 |
| renderer-ui | 渲染层：App Router 工作台壳层、书脊/案面/浮笺 chrome、主编辑器素笺显示层、控制中心与胶囊、文档打开流、主题/i18n、反馈与虚拟列表 | 上游：main-process（IPC 能力）、plugin（视图与贡献声明）；下游：用户（交互终点，无代码下游） | `app/`、`components/`、`lib/` | 工作台 / 书脊 / 案面 / 浮笺 / 控制中心 / 素笺 / 书耳 / 写作入口 |
| plugin | 插件限界：manifest 声明与校验、双目录 loader、启用/批准状态、沙箱帧协议与能力 broker、SDK、内置参考插件与贡献点 | 上游：main-process（loader/broker/protocol）、renderer-ui（帧宿主与贡献点注册表）；下游：renderer-ui（插件视图与运行时贡献） | `src/main/plugins/`、`src/shared/plugin.ts`、`src/plugin-sdk/`、`src/preload/index.ts`（pluginApi）、`components/plugins/`、`plugins/` | 插件 / manifest / 逻辑帧 / 视图帧 / 帧服务 / 贡献点 / 批准快照 / 能力裁决 |

## 上下文关系

- **main-process → renderer-ui**：主进程经 `DesktopApi`（`src/shared/types.ts`）与 preload `window.api` 提供工作区、文件、Git、GitHub、图片、发布与系统通知能力；渲染层不直接触达 fs / 网络。
- **renderer-ui ↔ plugin（宿主 / 插件伙伴关系）**：渲染层提供帧宿主、帧服务与贡献点注册表；插件提供 manifest 声明、沙箱视图与运行时状态。契约在 `src/shared/plugin.ts` 与 `src/plugin-sdk/` 两侧同步。
- **main-process ↔ plugin**：主进程 `plugins/loader.ts` 扫描并校验 manifest，`plugins/broker.ts` 按帧 session + manifest 权限裁决能力；插件帧不持有 `window.api`，能力经宿主中继。
- **共享内核**：`src/shared/`（仅类型与纯函数，禁 node/electron API）是 main-process 与 renderer-ui 的共同契约；`src/plugin-sdk/` 是 plugin 对插件作者的防腐层。共享内核变更必须两侧同步，不能在一侧私改。
- **外部系统不单独登记**：Git、GitHub、OSS 是 main-process 的外部适配，其术语只在主进程内成立，不作为限界上下文。

## 术语表增量

### 壳层与工作台（renderer-ui）

- **工作台**：整窗持久壳层（TitleBar + 书脊 + 目次浮笺 + 案面 + StatusBar）的统称；路由页只替换中央画芯，chrome 不随页面卸载。
- **书脊**：窗左缘恒 48px 的深墨竖条（Rail），图标即导航；右缘 1px 朱砂装订线，不承载内容。
- **案面**：main 容器的暖色桌面底；页面画芯（Sheet / 素笺）浮起其上，滚动只属于各内容容器。
- **浮笺**：浮在案面上的 absolute slip-card（目次、书耳），默认收起、保挂载显隐；与插件浮窗不是同一物。
- **浮窗**：`FloatLayer` 中的插件视图窗口（拖拽、缩放、最小化），与中央页面共存，切换路由不卸载。
- **目次**：`ContextPanel`，案面左缘的项目/文档树浮笺；由书脊项目钮或 ⌘B 开合。
- **书耳**：`/editor` 右缘的 `SidePane` 浮笺，承载大纲、元数据、图床与插件 `area=context` 页签；默认收起。
- **控制中心**：壳层胶囊展开的 470px 聚合面板（磁贴 + 任务/GIT/排版/编辑器/插件分区）；Dock 退役后壳层唯一聚合点。
- **壳层胶囊**：TitleBar 右侧的 chip，控制中心的开合入口；单独说「胶囊」通常指 chip，展开体称控制中心。
- **素笺**：编辑器 2.0 的纸面与显示层体系（衬线题阶、两端对齐、书口/呼墨/笔帘/笺条）；Markdown 正文是唯一事实源，装饰零字节改写。
- **书口**：`/editor` 右缘的大纲刻度柱，纯显示层导航；书耳展开时让位。
- **呼墨**：行首 `/` 查询行唤出的插入工具匣（`SlashMenu`）。
- **笔帘**：非空选区稳定 300ms 后浮现的格式工具条（`SelectionToolbar`）。
- **笺条**：把独立链接行整行替换为折角卡片（`CardWidget`）；元数据抓取失败回退为纯文字笺，正文不丢。
- **落笔印**：空文档的朱印空态与三语引导（`editor.blankHint`）。
- **写作入口**：进入唯一编辑面 `/editor` 的全部入口（项目树/项目页点 `.md`、草稿箱继续编辑、首页继续写作、命令面板新建/继续）。项目文件入口统一经 `openProjectFile` 收口（脏确认 → 按需切工作区 → readFile → openDoc），草稿入口经 `openDraft`；入口只负责把文档状态放进 `workspaceStore` 再跳转，编辑面本身不区分来源。
- **命令通道**：`lib/editor-commands.ts` 的 `EditorCommand` 契约，是壳层胶囊、呼墨、笔帘与编辑器解耦的唯一桥梁；编辑页不直呼主进程。
- **单挂载**：任一时刻仅一处挂载 CodeMirror 6 实例；`/editor` 是唯一编辑面。
- **专注模式**：只锚 `[data-chrome]` 的 chrome 退场模式；路由切换自动退出。

### 主进程与写作数据（main-process）

- **工作区**：被打开为写作根的本地目录；当前工作区的文档读写受 `safeJoin` / 工作区相对路径边界约束，Git 信息随 `WorkspaceInfo` 暴露；跨项目树浏览经显式 root 只读构树，不切换当前工作区。
- **最近项目**：`userData/recent-workspaces.json` 的最近工作区列表（按路径去重、cap 8）；`setWorkspace` 成功后登记。
- **草稿**：工作区之外的文档级暂存（`userData/drafts/<id>.md` + `index.json`），只覆盖 `activePath == null` 的新草稿会话；另存为落盘后消费。
- **文档迁移**：经 `transferDoc` 的改名/移动/复制；`<stem>.assets` 随迁、正文引用同步改写，路径与改写纯逻辑唯一事实源是 `src/shared/docTransfer.ts`。
- **发布通道**：把文档发布/更新为 GitHub Issue 的两条通道——CLI（`publishViaCli`，优先）与内置 publisher（降级）；发布身份 = frontmatter `issue` 字段。
- **图床**：图片上传路由（`oss` 直传或外部命令）；图片先落文档同名 `.assets`，远程链接只在用户经 Message 横幅确认后替换正文。
- **会话白名单**：原生 picker 选中的路径登记进内存白名单，`uploadImages` 只接受白名单内路径；不持久化，随会话存活。
- **凭证**：GitHub token 与 OSS AccessKey 经 `safeStorage` 加密存储；不进 `settings.json`、不落仓库配置、报错脱敏。
- **frontmatter**：文档头 YAML，承载 title/labels/`issue` 等发布元数据；解析与区间判定唯一口径在 `src/shared/frontmatter.ts`。

### 插件（plugin）

- **插件**：一个目录 + `plugin.json` manifest；来源为内置 `plugins/` 与 `userData/plugins/` 第三方目录，同 id 先扫到者胜。
- **manifest**：插件的声明式契约（id/views/permissions/logic/tasks/capsule/tabs/commands/publishers 等），由 `validateManifest` 严格校验。
- **沙箱帧**：`sandbox="allow-scripts"` 的不透明源帧（origin null），无 preload、无宿主 DOM；插件 UI 与逻辑都在帧内。
- **逻辑帧**：无界面的沙箱帧，运行插件 `logic` 入口（经典脚本对：先 SDK 后 `__startLogic`），用于后台状态上报。
- **视图帧**：渲染 manifest `views[].entry` 的沙箱帧；`main` 落路由页，`float` 落浮窗，`context` 落书耳页签。
- **帧服务**：渲染层 `PluginFrameHost` 对帧暴露的九个服务（cap、doc、render、ui、statusBar、tasks、capsule、events、panelTabs）；只读宿主状态走 svcUi 免权限通道，写能力走主进程 broker。
- **贡献点**：manifest 声明制扩展位（views、statusItems、tasks、capsule、tabs、commands、publishers）；运行时只能操作已声明资源，tasks/events 为例外护栏制。
- **批准快照**：`userData/plugin-state.json` 中插件 id → 批准时 manifest 权限快照；权限变更即失效待重批。
- **能力裁决**：主进程 broker 按帧 session + manifest 权限逐次裁决能力调用；能力白名单是 `CAPABILITY_METHODS`。

### 跨上下文契约

- **DesktopApi**：`src/shared/types.ts` 的类型化 IPC 契约；方法名即 channel，preload 拆 `IpcResult` 后向渲染层返回 data 或抛错。
- **共享内核**：`src/shared/` 的纯类型与纯函数（frontmatter、docTransfer、imagePlan、structure、revert 等），主进程与渲染层共用，禁止引入 node/electron API。

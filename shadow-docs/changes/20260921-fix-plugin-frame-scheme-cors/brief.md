---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-fix-plugin-frame-scheme-cors",
  "type": "fix",
  "scope": "src/main,components/plugins,tests,shadow-docs/knowledge",
  "status": "published",
  "baseBranch": "refactor/20260921-refactor-renderer-nextjs",
  "branch": "fix/20260921-fix-plugin-frame-scheme-cors",
  "files": [
    "components/plugins/PluginFrameHost.tsx",
    "shadow-docs/knowledge/plugin-architecture.md",
    "src/main/index.ts",
    "src/main/navigationGuard.ts",
    "src/main/schemes.ts",
    "tests/navigation-guard.test.ts",
    "tests/plugin-schemes.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 15,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/15",
    "pullRequest": 16,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/16"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "6c3fc5cec75c7fd69ef5ebb883e20e99c74482fa",
    "verifiedAt": "2026-09-21T11:40:32.361Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:16",
    "planHash": "843e5c2dc329b04acc9c216fe88968a07b70960eb9dfb281c97504a65fcafe9b",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 修复插件帧握手超时——plugin 协议补 CORS 资格 + 帧失败分层诊断",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n插件视图与浮窗在 `pnpm dev` 与打包产物下**一律**显示「插件视图加载失败：插件帧未就绪（5000ms 超时）」，插件能力实际不可用。该现象自插件系统落地起就存在（原始 brief 明确记录「未做 Electron GUI 手工冒烟」，帧渲染从未被真正验证），上一轮迁移变更已判定为既有缺陷并单开本 fix。\n\n**根因（本次运行复现坐实，非推断）**：`plugin:` scheme 注册时**缺 `corsEnabled: true`**。插件帧是 `sandbox=\"allow-scripts\"` 的不透明源帧（`origin: null`），帧内 `<script type=\"module\" src=\"./view.js\">`、SDK `@core/sdk.js`、逻辑入口 `import()` 全部是 **CORS 模式的 module 请求**——Chromium 只对 CORS 已启用的协议放行跨源脚本，`plugin:` 不在其列，于是脚本被拦、`window.wuh` 从未定义、握手 `hello → ready` 无法完成、宿主 5s 超时。\n\n探针实测（Electron 44.4.3，`.walkthrough/probe-frame-custom-scheme.cjs`，五组对照）：\n\n```\n# 修复前\nplugin://p1/index.html 导航成功（load 触发，protocol.handle 命中）\nCONSOLE Access to script at 'plugin://p1/m.js' from origin 'null' has been blocked by CORS policy:\n        Cross origin requests are only supported for protocol schemes:\n        app, chrome, chrome-extension, chrome-untrusted, data, http, https\n\n# 修复后（仅补 corsEnabled: true）\nprotocol HIT plugin://p1/m.js → CONSOLE MODULE_EXECUTED   ← A/B/C/D/E 五组全部通过\n```\n\n**三条被本次证伪/排除的可能原因**（写进 brief 以免重蹈）：\n\n1. **「沙箱外协议阻断」不成立**——历史 brief 记录的 `Navigation to external protocol blocked by sandbox` 属误归因。实测全部 sandbox 变体（`allow-scripts` / 加 token / 去 sandbox / `allow-same-origin`）帧导航均成功 load，`protocol.handle` 均被命中。Electron 的 `NavigationRequest::IsExternalProtocol()` 走 `ContentBrowserClient::IsHandledURL()`，已注册为 privileged 的自定义 scheme 不判为外部协议；即便判为外部协议，Electron 的 `HandleExternalProtocol` 也**恒返回 true**（导航被消费转 `RequestOpenExternalPermission`），所以「加 sandbox token」只会让报错消失、帧依旧不加载——该路线已放弃。\n2. **CSP 不是原因**（PR #9 已修 `frame-src plugin:`，本次全程无 CSP 违例）。\n3. **`app://` 顶层加载正常**，说明协议层本身工作，缺陷只在 CORS 资格这一位权限标志。\n\n## 引用规范\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 插件帧为 `sandbox=\"allow-scripts\"` 不透明源帧；manifest 声明制 + broker 权限裁决；消息协议 kind 变更须同步 shared/SDK/宿主三方\n  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, src/preload/index.ts\n  - 本次遵循: 不放宽沙箱（仍为不透明源、不引入任何 sandbox token）、不给单插件开特例通道、协议注册是帧可达性的唯一前提位\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 页面 CSP 显式 `frame-src plugin:`；`NEXT_PUBLIC_APP_VERSION` 注入；styled-components 样式载体\n  - 本次遵循: 不动 CSP 与壳层 chrome；帧失败文案属宿主诊断信息，落在 `PluginFrameHost` 既有 `ViewError` 位\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: main/float 视图经 App Router 路由段落位，`FloatLayer` 常驻\n  - 本次遵循: 不新增路由段、不改视图落位\n- norms/tdd-verification.md（通用）\n  - 执行约束: Bug 修复须先有能复现失败的测试；「完成」声明必须附验证输出\n- knowledge/bug-investigation.md（通用）\n  - 执行约束: 同 Bug 的复现→根因→最小修复→回归由单一上下文完成，不拆分给隔离子代理\n\n## 决策\n- **选型:** `plugin:` scheme 注册补 `corsEnabled: true`（唯一行为改动），并把受特权 scheme 表抽为可测模块 `src/main/schemes.ts`；配套给 `openFrame` 补**帧失败分层诊断**；另含用户已选的顶层导航白名单加固（Phase 2，与本缺陷无因果关系，可单独丢弃）。\n- **对比方案:**\n  - *帧 sandbox 追加 `allow-top-navigation-to-custom-protocols`*（原路线 A 的核心）：**否决**——实测导航层从未被拦，该 token 对缺陷无效；而 Electron 的 `HandleExternalProtocol` 恒消费导航，一旦真的判为外部协议，token 只会让外部打开被尝试、帧仍不加载。且它会放开「插件帧触发自定义协议导航」这一能力，放行面无收益。\n  - *srcdoc + `<base href>` 传输层改造*：**否决**——同一条 CORS 资格缺失照样拦 module 脚本（探针 E 组已证），且 baseURI/相对路径语义变化要重验三个官方插件，纯增面。\n  - *改 WebContentsView 子 webContents*：**否决**——架构级改造，超出 fix 体量。\n  - *去掉 sandbox 属性*：**否决**——不透明源一旦变成 `plugin://<id>` 同源，帧内脚本获得更宽能力（同源资源读写、顶层导航），放行面大于收益。\n- **理由:** 一个权限位即可让帧可达，沙箱模型、CSP、消息协议与插件契约**全部不变**；用可测模块把这条「帧可达性前提」固化下来，避免再次因缺一位权限标志而全局不可用。诊断分层的收益已被本次缺陷验证：5s 超时文案把「导航未完成」与「文档已加载但握手静默」混为一谈，导致 CORS 报错只在 DevTools 里可见、缺陷长期隐形。\n- **base-branch:** `refactor/20260921-refactor-renderer-nextjs`（迁移分支）。理由：修复落在迁移后的渲染层路径（`components/plugins/PluginFrameHost.tsx`）；用户已定「迁移先发」，PR #14 合入 main 后本变更 PR 自动重定向。缺陷本身与迁移无因果（main 上同样存在），如需热修可把同一行改动单开 hotfix。\n\n## 任务\n### Phase 1 — 最小修复（TDD 先行）\n- [ ] 抽出 `src/main/schemes.ts`：受特权 scheme 表（`local-resource`/`plugin`/`app`），`plugin` 补 `corsEnabled: true` 并注释说明其为何是帧可达性前提（不透明帧的 module/CORS 请求）— `src/main/schemes.ts,src/main/index.ts` — 新增/修改\n- [ ] 失败测试先行：`tests/plugin-schemes.test.ts` 断言 `plugin` 必须 `corsEnabled`（修复前红、修复后绿）+ 三 scheme 的 `standard/secure/supportFetchAPI` 不变量 — `tests/plugin-schemes.test.ts` — 新增\n- [ ] 帧失败分层诊断：`openFrame` 记录是否收到 `load`，超时文案区分「导航未完成」与「文档已加载但握手静默」并附帧 URL — `components/plugins/PluginFrameHost.tsx` — 修改\n\n### Phase 2 — 顶层导航加固（用户已选，独立于本缺陷）\n- [ ] `src/main/navigationGuard.ts` 纯函数：顶层导航白名单（放行 `app://shell/*` 与 dev 源，拒绝其余）+ `will-navigate` 接线 — `src/main/navigationGuard.ts,src/main/index.ts` — 新增/修改\n- [ ] 白名单纯函数测试 — `tests/navigation-guard.test.ts` — 新增\n\n### Phase 3 — 验证与文档\n- [ ] 验证：`pnpm typecheck` + vitest 全量 + `pnpm build`（next + electron-vite）— 仓库根 — 验证\n- [ ] 用户运行验收：`pnpm dev` 打开 Git 历史 / 预览 / Frontmatter 视图，确认帧渲染内容（不再 5s 超时）\n- [ ] 知识卡更新：`plugin-architecture.md` 增「帧可达性前提 = scheme `corsEnabled`」与「排除沙箱外协议阻断误判」— `shadow-docs/knowledge/plugin-architecture.md` — 修改\n- [ ] brief 结果段回填（含验收口径）— `shadow-docs/changes/<本变更>/brief.md` — 修改\n\n完整 brief：shadow-docs/changes/20260921-fix-plugin-frame-scheme-cors/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260921-fix-plugin-frame-scheme-cors\",\"type\":\"fix\",\"scope\":\"src/main,components/plugins,tests,shadow-docs/knowledge\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"refactor/20260921-refactor-renderer-nextjs\",\"briefPath\":\"shadow-docs/changes/20260921-fix-plugin-frame-scheme-cors/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 修复插件帧握手超时——plugin 协议补 CORS 资格 + 帧失败分层诊断

## 动机

插件视图与浮窗在 `pnpm dev` 与打包产物下**一律**显示「插件视图加载失败：插件帧未就绪（5000ms 超时）」，插件能力实际不可用。该现象自插件系统落地起就存在（原始 brief 明确记录「未做 Electron GUI 手工冒烟」，帧渲染从未被真正验证），上一轮迁移变更已判定为既有缺陷并单开本 fix。

**根因（本次运行复现坐实，非推断）**：`plugin:` scheme 注册时**缺 `corsEnabled: true`**。插件帧是 `sandbox="allow-scripts"` 的不透明源帧（`origin: null`），帧内 `<script type="module" src="./view.js">`、SDK `@core/sdk.js`、逻辑入口 `import()` 全部是 **CORS 模式的 module 请求**——Chromium 只对 CORS 已启用的协议放行跨源脚本，`plugin:` 不在其列，于是脚本被拦、`window.wuh` 从未定义、握手 `hello → ready` 无法完成、宿主 5s 超时。

探针实测（Electron 44.4.3，`.walkthrough/probe-frame-custom-scheme.cjs`，五组对照）：

```
# 修复前
plugin://p1/index.html 导航成功（load 触发，protocol.handle 命中）
CONSOLE Access to script at 'plugin://p1/m.js' from origin 'null' has been blocked by CORS policy:
        Cross origin requests are only supported for protocol schemes:
        app, chrome, chrome-extension, chrome-untrusted, data, http, https

# 修复后（仅补 corsEnabled: true）
protocol HIT plugin://p1/m.js → CONSOLE MODULE_EXECUTED   ← A/B/C/D/E 五组全部通过
```

**三条被本次证伪/排除的可能原因**（写进 brief 以免重蹈）：

1. **「沙箱外协议阻断」不成立**——历史 brief 记录的 `Navigation to external protocol blocked by sandbox` 属误归因。实测全部 sandbox 变体（`allow-scripts` / 加 token / 去 sandbox / `allow-same-origin`）帧导航均成功 load，`protocol.handle` 均被命中。Electron 的 `NavigationRequest::IsExternalProtocol()` 走 `ContentBrowserClient::IsHandledURL()`，已注册为 privileged 的自定义 scheme 不判为外部协议；即便判为外部协议，Electron 的 `HandleExternalProtocol` 也**恒返回 true**（导航被消费转 `RequestOpenExternalPermission`），所以「加 sandbox token」只会让报错消失、帧依旧不加载——该路线已放弃。
2. **CSP 不是原因**（PR #9 已修 `frame-src plugin:`，本次全程无 CSP 违例）。
3. **`app://` 顶层加载正常**，说明协议层本身工作，缺陷只在 CORS 资格这一位权限标志。

## 引用规范

- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 插件帧为 `sandbox="allow-scripts"` 不透明源帧；manifest 声明制 + broker 权限裁决；消息协议 kind 变更须同步 shared/SDK/宿主三方
  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, src/preload/index.ts
  - 本次遵循: 不放宽沙箱（仍为不透明源、不引入任何 sandbox token）、不给单插件开特例通道、协议注册是帧可达性的唯一前提位
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 页面 CSP 显式 `frame-src plugin:`；`NEXT_PUBLIC_APP_VERSION` 注入；styled-components 样式载体
  - 本次遵循: 不动 CSP 与壳层 chrome；帧失败文案属宿主诊断信息，落在 `PluginFrameHost` 既有 `ViewError` 位
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: main/float 视图经 App Router 路由段落位，`FloatLayer` 常驻
  - 本次遵循: 不新增路由段、不改视图落位
- norms/tdd-verification.md（通用）
  - 执行约束: Bug 修复须先有能复现失败的测试；「完成」声明必须附验证输出
- knowledge/bug-investigation.md（通用）
  - 执行约束: 同 Bug 的复现→根因→最小修复→回归由单一上下文完成，不拆分给隔离子代理

## 决策

- **选型:** `plugin:` scheme 注册补 `corsEnabled: true`（唯一行为改动），并把受特权 scheme 表抽为可测模块 `src/main/schemes.ts`；配套给 `openFrame` 补**帧失败分层诊断**；另含用户已选的顶层导航白名单加固（Phase 2，与本缺陷无因果关系，可单独丢弃）。
- **对比方案:**
  - *帧 sandbox 追加 `allow-top-navigation-to-custom-protocols`*（原路线 A 的核心）：**否决**——实测导航层从未被拦，该 token 对缺陷无效；而 Electron 的 `HandleExternalProtocol` 恒消费导航，一旦真的判为外部协议，token 只会让外部打开被尝试、帧仍不加载。且它会放开「插件帧触发自定义协议导航」这一能力，放行面无收益。
  - *srcdoc + `<base href>` 传输层改造*：**否决**——同一条 CORS 资格缺失照样拦 module 脚本（探针 E 组已证），且 baseURI/相对路径语义变化要重验三个官方插件，纯增面。
  - *改 WebContentsView 子 webContents*：**否决**——架构级改造，超出 fix 体量。
  - *去掉 sandbox 属性*：**否决**——不透明源一旦变成 `plugin://<id>` 同源，帧内脚本获得更宽能力（同源资源读写、顶层导航），放行面大于收益。
- **理由:** 一个权限位即可让帧可达，沙箱模型、CSP、消息协议与插件契约**全部不变**；用可测模块把这条「帧可达性前提」固化下来，避免再次因缺一位权限标志而全局不可用。诊断分层的收益已被本次缺陷验证：5s 超时文案把「导航未完成」与「文档已加载但握手静默」混为一谈，导致 CORS 报错只在 DevTools 里可见、缺陷长期隐形。
- **base-branch:** `refactor/20260921-refactor-renderer-nextjs`（迁移分支）。理由：修复落在迁移后的渲染层路径（`components/plugins/PluginFrameHost.tsx`）；用户已定「迁移先发」，PR #14 合入 main 后本变更 PR 自动重定向。缺陷本身与迁移无因果（main 上同样存在），如需热修可把同一行改动单开 hotfix。

## 任务

### Phase 1 — 最小修复（TDD 先行）
- [x] 抽出 `src/main/schemes.ts`：受特权 scheme 表（`local-resource`/`plugin`/`app`），`plugin` 补 `corsEnabled: true` 并注释说明其为何是帧可达性前提（不透明帧的 module/CORS 请求）— `src/main/schemes.ts,src/main/index.ts` — 新增/修改
- [x] 失败测试先行：`tests/plugin-schemes.test.ts` 断言 `plugin` 必须 `corsEnabled`（修复前红、修复后绿）+ 三 scheme 的 `standard/secure/supportFetchAPI` 不变量 — `tests/plugin-schemes.test.ts` — 新增
- [x] 帧失败分层诊断：`openFrame` 记录是否收到 `load`，超时文案区分「导航未完成」与「文档已加载但握手静默」并附帧 URL — `components/plugins/PluginFrameHost.tsx` — 修改

### Phase 2 — 顶层导航加固（用户已选，独立于本缺陷）
- [x] `src/main/navigationGuard.ts` 纯函数：顶层导航白名单（放行 `app://shell/*` 与 dev 源，拒绝其余）+ `will-navigate` 接线 — `src/main/navigationGuard.ts,src/main/index.ts` — 新增/修改
- [x] 白名单纯函数测试 — `tests/navigation-guard.test.ts` — 新增

### Phase 3 — 验证与文档
- [x] 验证：`pnpm typecheck` + vitest 全量 + `pnpm build`（next + electron-vite）— 仓库根 — 验证
- [x] 用户运行验收：`pnpm dev` 打开 Git 历史 / 预览 / Frontmatter 视图，确认帧渲染内容（不再 5s 超时）
- [x] 知识卡更新：`plugin-architecture.md` 增「帧可达性前提 = scheme `corsEnabled`」与「排除沙箱外协议阻断误判」— `shadow-docs/knowledge/plugin-architecture.md` — 修改
- [x] brief 结果段回填（含验收口径）— `shadow-docs/changes/<本变更>/brief.md` — 修改

## 结果

- 实际耗时: 约 2h（根因取证占大头：Chromium/Electron 源码考古 + 一次性探针）
- 验证:
  - **根因复现与回归（运行级证据）**：一次性探针 `.walkthrough/probe-frame-custom-scheme.cjs`（Electron 44.4.3，注册表与本项目一致）五组对照——修复前 `plugin://p1/index.html` 导航成功，但帧内 module 脚本被 `Cross origin requests are only supported for protocol schemes: app, chrome, chrome-extension, chrome-untrusted, data, http, https` 拦下；补 `corsEnabled: true` 后 A（`allow-scripts`，即本项目现状）/ B（加 token）/ C（无 sandbox）/ D（`allow-same-origin`）/ E（srcdoc + base）五组全部 `MODULE_EXECUTED`
  - **TDD 门禁**：`tests/plugin-schemes.test.ts` 先红（`expected undefined to be true`，正是缺 `corsEnabled` 一位）→ 补一位后绿
  - `pnpm typecheck`：`tsc --noEmit` node + next 双工程通过
  - `node node_modules/vitest/vitest.mjs run`：**124/124 全绿**（18 文件；较变更前 115 例增 9 例：plugin-schemes 4 + navigation-guard 5）
  - `pnpm build`：Next 静态导出 7/7 路由（三插件视图 SSG）+ electron-vite main/preload bundle 成功
  - **实机验收（task-7）口径**：验收动作（`pnpm dev` 打开 Git 历史 / 预览 / Frontmatter 视图与预览浮窗，确认帧渲染出内容、不再出现「插件帧未就绪」）按用户既定约定由用户执行、不由我跑脚本；task-7 依用户「继续」指示勾选，**实机现象未回报**——若验收不过，按新分层文案（导航层 / 帧内脚本层）定位，探针 `.walkthrough/probe-frame-custom-scheme.cjs` 可直接复用
- 顺带修复（同一变更内，环境损坏）：`apps/desktop/node_modules` 中 13 个依赖软链指向已删除的基线 worktree（`D:/tmp/wuh-baseline`），导致 electron 等依赖不可用；已用 `pnpm install --prefer-offline` 重新指向本地 store，验证 `electron 44.4.3` 二进制就位，另删除一个已从依赖移除的 `codemirror` 残留链接
- **文件清单偏差**：`next-env.d.ts`（Next 自动生成，非手改）在构建时被 Next 重写——引用由 `./dist/next/dev/types/*` 改为磁盘上真实存在的 `./.next/types/*`；提交版本引用的 `dist/next/dev/types` 并不存在（迁移遗留的死引用），故保留重写结果而非回退。另 `shadow-docs/menu.md`（超出声明范围）：给「插件系统」路由行补本卡新增关键词（帧 / 握手 / ready / 协议注册 / corsEnabled），否则新写入卡片的「帧可达性前提」在 propose 阶段无法被路由命中
- **遗留观察（非本次引入，未在本变更修复）**：`plugin-architecture.md` 首条 source `changes/archive/20260915-feature-desktop-plugin-system/brief.md` 在 desktop 仓库不存在——该变更归档在**父仓库** `x.wuh.site/shadow-docs/changes/archive/` 下，卡片里未标「父仓库」前缀（与同卡关联知识段写法不一致）；按「不顺手扩大范围」记录待单独治理

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/plugin-architecture.md
- **理由:** 本次确认「协议权限位决定帧可达性」是插件系统架构的稳定前提事实，且推翻了历史 brief 中「沙箱外协议阻断」的错误归因——不写进卡片，后来人会再次按错误方向排查（把 sandbox token 当解法）。`shell-chrome-design.md` 的 CSP 段与 `renderer-shell-routing.md` 的视图落位本次均无事实变化，不需更新。

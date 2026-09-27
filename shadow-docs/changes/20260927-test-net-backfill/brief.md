---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-test-net-backfill",
  "type": "test",
  "scope": "tests",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": null,
  "files": [
    "tests/account-render.test.tsx",
    "tests/float-geometry.test.ts",
    "tests/float-layer-render.test.tsx",
    "tests/floats.test.ts",
    "tests/settings-render.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 118,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/118",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "7fd70eab13bf73b2ea14730754d1ba4f3302b66b",
    "verifiedAt": "2026-09-27T07:40:10.987Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:118",
    "planHash": "af0f1b97c01b6b130d6ad50ef379a6eff1f7de11da87b6135b0dc6943eca6154",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[test] test: 测试网补齐——浮窗域单测 + FloatLayer/Account/Settings 渲染冒烟",
      "titleRaw": "test: 测试网补齐——浮窗域单测 + FloatLayer/Account/Settings 渲染冒烟",
      "supplement": "补齐两次拆分 change 期间裸奔的测试债：FloatLayer/PluginManagerSection/SettingsPage/AccountPage 四个 0 覆盖常驻件渲染冒烟（happy-dom + 零 React 告警）+ viewportOf/nextGeometry 纯函数单测 + lib/floats 注册表契约单测；纯测试新增零产品代码改动。方案见 shadow-docs/changes/20260927-test-net-backfill/brief.md",
      "body": "## 动机\n两次组件拆分 change（20260926/20260927）期间，FloatLayer、PluginManagerSection、SettingsPage、AccountPage 四个常驻壳层件均无直接测试（0 引用），每次重组只能靠 tsc + 全量间接兜底；lib/floats.ts 无测试网是 createStore change（PR #105）偏差段就记录的遗留；FloatLayer/geometry.ts 拆成纯函数正是为了可测但测试未跟上。本变更一次性还清测试债，为后续 frameProtocol 再拆等变更建立护航网。\n\n## 引用规范\n- norms/tdd-verification.md：S 级零行为变更；本变更以测试为交付物本身\n- shadow-docs/knowledge/shell-chrome-design.md：floats 注册表契约（commit 产新引用、几何视口=main 容器）作为 floats 单测断言依据\n- shadow-docs/knowledge/ui-feedback.md：反馈三 Host 只读订阅语义，作为渲染冒烟断言依据\n\n## 决策\n- **选型:** ①`tests/float-geometry.test.ts`：viewportOf（null/元素两态）+ nextGeometry（8 向缩放边界、最小宽高钳制）；②`tests/floats.test.ts`：注册表契约（open/close/focus/top/minimize/restore/clampGeometry、commit 产新引用）；③渲染冒烟 ×3：account-render（三态：未授权/加载/已授权身份卡）、settings-render（含 PluginManagerSection：skeleton 加载态）、float-layer-render（空层 + seed 单窗的窗口 chrome/最小化 chip）。渲染测试沿用 happy-dom + 零 React 告警手法。\n- **对比方案:** 顺手补齐主进程 workspace/ipc 测试——超出一轮主题，弃（另立变更）。\n- **理由:** 只加测试不改产品代码，S 级干净；四个 0 覆盖件与两块纯函数一次织网。\n\n## 任务\n### Phase 1\n- [ ] float-geometry 单测——`tests/float-geometry.test.ts`\n- [ ] lib/floats 注册表契约单测——`tests/floats.test.ts`\n### Phase 2\n- [ ] FloatLayer 渲染冒烟——`tests/float-layer-render.test.tsx`\n- [ ] AccountPage 渲染冒烟——`tests/account-render.test.tsx`\n- [ ] SettingsPage + PluginManagerSection 渲染冒烟——`tests/settings-render.test.tsx`\n### Phase 3\n- [ ] 全量 vitest + 三 tsconfig typecheck 全绿——`package.json`\n- [ ] brief 结果回填——`shadow-docs/changes/20260927-test-net-backfill/brief.md`\n\n## 补充\n补齐两次拆分 change 期间裸奔的测试债：FloatLayer/PluginManagerSection/SettingsPage/AccountPage 四个 0 覆盖常驻件渲染冒烟（happy-dom + 零 React 告警）+ viewportOf/nextGeometry 纯函数单测 + lib/floats 注册表契约单测；纯测试新增零产品代码改动。方案见 shadow-docs/changes/20260927-test-net-backfill/brief.md\n\n完整 brief：shadow-docs/changes/20260927-test-net-backfill/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-test-net-backfill\",\"type\":\"test\",\"scope\":\"tests\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-test-net-backfill/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "test"
      ]
    },
    "release": {
      "files": [
        "shadow-docs/changes/20260927-test-net-backfill/brief.md",
        "tests/account-render.test.tsx",
        "tests/float-geometry.test.tsx",
        "tests/float-layer-render.test.tsx",
        "tests/floats.test.ts",
        "tests/settings-render.test.tsx"
      ],
      "message": "test: 测试网补齐——viewportOf/nextGeometry 纯函数单测 + lib/floats 注册表契约单测 + FloatLayer/AccountPage/SettingsPage(含 PluginManagerSection) 渲染冒烟共 5 文件 26 用例；全量 63 文件/530 用例单次全绿，三 tsconfig PASS（Closes #118）",
      "title": "test: 测试网补齐——浮窗域单测 + 四个常驻件渲染冒烟",
      "body": "Closes #118\n\n完整 brief：shadow-docs/changes/20260927-test-net-backfill/brief.md"
    }
  },
  "knowledge": {
    "action": "无需变更",
    "target": null,
    "reason": "纯测试新增零产品代码改动：5 文件 26 用例绿 + 全量 63 文件/530 用例单次全绿 + 三 tsconfig PASS；测试与既有 happy-dom 冒烟同构，无新长期事实（dom-env 桩行为与 pluginApi 直读事实已固化在测试注释内）"
  }
}
---

# 测试网补齐：浮窗域单测 + 四个常驻件渲染冒烟

## 动机
两次组件拆分 change（20260926/20260927）期间，FloatLayer、PluginManagerSection、SettingsPage、AccountPage 四个常驻壳层件均无直接测试（0 引用），每次重组只能靠 tsc + 全量间接兜底；lib/floats.ts 无测试网是 createStore change（PR #105）偏差段就记录的遗留；FloatLayer/geometry.ts 拆成纯函数正是为了可测但测试未跟上。本变更一次性还清测试债，为后续 frameProtocol 再拆等变更建立护航网。

## 复杂度评级
- **评级:** S
- **理由:** 契约变更=无（纯新增测试文件，产品代码零改动——若发现产品代码问题只记录不顺手修）；触及面=tests/ 新增 5 文件；可发现性=不适用。
- **期望验证深度:** unit（测试本身就是产出）

## 引用规范
- norms/tdd-verification.md：S 级零行为变更；本变更以测试为交付物本身
- shadow-docs/knowledge/shell-chrome-design.md：floats 注册表契约（commit 产新引用、几何视口=main 容器）作为 floats 单测断言依据
- shadow-docs/knowledge/ui-feedback.md：反馈三 Host 只读订阅语义，作为渲染冒烟断言依据

## 决策
- **选型:** ①`tests/float-geometry.test.ts`：viewportOf（null/元素两态）+ nextGeometry（8 向缩放边界、最小宽高钳制）；②`tests/floats.test.ts`：注册表契约（open/close/focus/top/minimize/restore/clampGeometry、commit 产新引用）；③渲染冒烟 ×3：account-render（三态：未授权/加载/已授权身份卡）、settings-render（含 PluginManagerSection：skeleton 加载态）、float-layer-render（空层 + seed 单窗的窗口 chrome/最小化 chip）。渲染测试沿用 happy-dom + 零 React 告警手法。
- **对比方案:** 顺手补齐主进程 workspace/ipc 测试——超出一轮主题，弃（另立变更）。
- **理由:** 只加测试不改产品代码，S 级干净；四个 0 覆盖件与两块纯函数一次织网。

## 任务
### Phase 1
- [x] float-geometry 单测——`tests/float-geometry.test.ts`
- [x] lib/floats 注册表契约单测——`tests/floats.test.ts`
### Phase 2
- [x] FloatLayer 渲染冒烟——`tests/float-layer-render.test.tsx`
- [x] AccountPage 渲染冒烟——`tests/account-render.test.tsx`
- [x] SettingsPage + PluginManagerSection 渲染冒烟——`tests/settings-render.test.tsx`
### Phase 3
- [x] 全量 vitest + 三 tsconfig typecheck 全绿——`package.json`
- [x] brief 结果回填——`shadow-docs/changes/20260927-test-net-backfill/brief.md`

## 结果
- 实际耗时: 约 1.5h（含三起首跑失败定位）
- 验证: 新增 5 文件 26 用例全绿（geometry 7 + floats 11 + float-layer 3 + account 3 + settings 4）；全量 vitest **63 文件 / 530 用例单次全绿**；三 tsconfig typecheck 全 PASS
- 偏差与发现:
  1. **float-geometry.test 需 .tsx 后缀**：node 侧 tsconfig exclude `tests/**/*.tsx`（DOM 测试不进无 DOM lib 的主程序），纯逻辑但依赖 window 的该测试按既有惯例落 .tsx。
  2. **dom-env api 桩为 get 陷阱硬编码**，属性赋值覆盖无效——渲染测试须整对象替换 window.api（已在测试内注明）；后续可考虑给助手加 overrides 参数（未做，保持本轮零产品/助手代码改动）。
  3. **FloatLayer 渲染测试以桩替换 PluginView**：happy-dom 不支持 plugin:// 沙箱帧导航，帧生命周期由 plugin-broker/protocol 契约测试覆盖。
  4. PluginManagerSection 直接读 window.pluginApi.list（非 window.api.pluginApi 转发），桩需独立安装——已用测试固化该事实。

## 知识评估
- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 纯测试新增；渲染手法与既有 happy-dom 冒烟同构，不产生新长期事实。

---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-fix-vditor-theme-bridge",
  "type": "fix",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "fix/20260922-fix-vditor-theme-bridge",
  "files": [
    "components/editor/MarkdownEditor.tsx",
    "components/home/EditorPanel.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 43,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/43",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "c7b110f78dba43e540d2903243b05fa1385465b6",
    "verifiedAt": "2026-09-22T13:02:10.846Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:43",
    "planHash": "7efef813b65cef731c673a342a850790a07d8714400e6f913e339371267af4c7",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 修复 Vditor 主题桥接失效（编辑区白底灰字）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n20260922-feature-vditor-md-editor 上线后目检发现：暗色主题下编辑区呈现 Vditor 原版亮色样式（白底、灰字、自带边框），与壳层主题完全脱节。根因经源码证实：Vditor 把 `vditor` 类加在**挂载元素自身**（`destroy()` 中 `element.classList.remove(\"vditor\")` 为证），而非子元素——已实施的桥接层用后代选择器 `.md-editor .vditor` 匹配，一条都没命中，全部 token 覆盖静默失效。\n\n## 引用规范\n- `shadow-docs/knowledge/desktop-plugin-architecture.md`（父仓库）\n  - 当前结论: 主编辑器为 Vditor 4 IR，运行时资源 public/vditor 本地化；样式桥接要求 token 化。\n  - 适用 scope: apps/desktop —— 本变更为该结论的实现缺陷修复，不改架构。\n- `shadow-docs/knowledge/design-system.md`（父仓库）\n  - 当前结论: UI 颜色只经主题语义 token，字体只用三语义 token。\n  - 适用 scope: 修复后的桥接层继续只写 var(--token)，并需在明暗两主题下成立。\n\n## 决策\n- **伴生缺陷（用户目检补充）:** 编辑区白框贴合面板上缘且圆角/阴影外溢，视觉上遮挡面板顶部与上方卡片间距——旧版 EditorArea 的 8px 上内缩被去除所致。\n- **选型:** 撤销 createGlobalStyle 全局层，把 CSS 变量与后代样式全部改为**挂载元素自身**的复合选择器（styled-components 的 `&.vditor`、`&.vditor--dark`、`& .vditor-reset`）——同为 (0,1,0) 的 Vditor 变量块被 (0,2,0) 压制，不依赖注入顺序；CSS 变量经继承到达全部子树。\n- **映射范围:** 面板/工具栏/输入面背景、边框、标题分割线、引用色、计数面 + IR 语法色（--ir-heading/link/bi/bracket/paren/title）+ 正文/代码字体三 token；callout 语义彩保留 Vditor 原值（属固定语义色，同品牌插图豁免边界）。\n- **排版对齐:** 正文 14px/1.7 var(--font-sans)、代码 --font-mono、链接 var(--primary-color)、placeholder var(--text-muted)、内容主题 CSS（content-theme/light|dark.css 本地已有）被更高优先级覆盖。\n- **对比方案:** 保留全局层改选择器——全局样式注入顺序是已知脆弱点（build-config 卡片教训），复合选择器方案零顺序依赖，优。\n\n## 任务\n### Phase 1 桥接修复与排版对齐\n- [ ] 撤 createGlobalStyle，token 变量映射（含 --ir-* 语法色）与排版样式改为挂载元素复合选择器，明暗两主题生效 — `components/editor/MarkdownEditor.tsx`\n- [ ] 面板布局钳制：编辑区恢复上内缩、面板 overflow 裁剪 + 圆角对齐，消除白框外溢遮挡 — `components/home/EditorPanel.tsx`\n### Phase 2 回归\n- [ ] 全量回归：vitest + 双侧 tsc + next build + electron-vite build；明/暗 × 酒红/素雅目检编辑区 — —\n\n完整 brief：shadow-docs/changes/20260922-fix-vditor-theme-bridge/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-fix-vditor-theme-bridge\",\"type\":\"fix\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-fix-vditor-theme-bridge/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 修复 Vditor 主题桥接失效（编辑区白底灰字）

## 动机

20260922-feature-vditor-md-editor 上线后目检发现：暗色主题下编辑区呈现 Vditor 原版亮色样式（白底、灰字、自带边框），与壳层主题完全脱节。根因经源码证实：Vditor 把 `vditor` 类加在**挂载元素自身**（`destroy()` 中 `element.classList.remove("vditor")` 为证），而非子元素——已实施的桥接层用后代选择器 `.md-editor .vditor` 匹配，一条都没命中，全部 token 覆盖静默失效。

## 引用规范

- `shadow-docs/knowledge/desktop-plugin-architecture.md`（父仓库）
  - 当前结论: 主编辑器为 Vditor 4 IR，运行时资源 public/vditor 本地化；样式桥接要求 token 化。
  - 适用 scope: apps/desktop —— 本变更为该结论的实现缺陷修复，不改架构。
- `shadow-docs/knowledge/design-system.md`（父仓库）
  - 当前结论: UI 颜色只经主题语义 token，字体只用三语义 token。
  - 适用 scope: 修复后的桥接层继续只写 var(--token)，并需在明暗两主题下成立。

## 决策

- **伴生缺陷（用户目检补充）:** 编辑区白框贴合面板上缘且圆角/阴影外溢，视觉上遮挡面板顶部与上方卡片间距——旧版 EditorArea 的 8px 上内缩被去除所致。
- **选型:** 撤销 createGlobalStyle 全局层，把 CSS 变量与后代样式全部改为**挂载元素自身**的复合选择器（styled-components 的 `&.vditor`、`&.vditor--dark`、`& .vditor-reset`）——同为 (0,1,0) 的 Vditor 变量块被 (0,2,0) 压制，不依赖注入顺序；CSS 变量经继承到达全部子树。
- **映射范围:** 面板/工具栏/输入面背景、边框、标题分割线、引用色、计数面 + IR 语法色（--ir-heading/link/bi/bracket/paren/title）+ 正文/代码字体三 token；callout 语义彩保留 Vditor 原值（属固定语义色，同品牌插图豁免边界）。
- **排版对齐:** 正文 14px/1.7 var(--font-sans)、代码 --font-mono、链接 var(--primary-color)、placeholder var(--text-muted)、内容主题 CSS（content-theme/light|dark.css 本地已有）被更高优先级覆盖。
- **对比方案:** 保留全局层改选择器——全局样式注入顺序是已知脆弱点（build-config 卡片教训），复合选择器方案零顺序依赖，优。

## 任务

### Phase 1 桥接修复与排版对齐
- [x] 撤 createGlobalStyle，token 变量映射（含 --ir-* 语法色）与排版样式改为挂载元素复合选择器，明暗两主题生效 — `components/editor/MarkdownEditor.tsx`
- [x] 面板布局钳制：编辑区恢复上内缩、面板 overflow 裁剪 + 圆角对齐，消除白框外溢遮挡 — `components/home/EditorPanel.tsx`
### Phase 2 回归
- [x] 全量回归：vitest + 双侧 tsc + next build + electron-vite build；明/暗 × 酒红/素雅目检编辑区 — —

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/desktop-plugin-architecture.md`
- **理由:** 「Vditor 的 vditor 类在挂载元素自身、样式桥接必须写在挂载元素复合选择器上」是长期有效的集成事实，release 阶段并入卡片编辑器引擎段。

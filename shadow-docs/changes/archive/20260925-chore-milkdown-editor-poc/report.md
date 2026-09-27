# Milkdown 选型评估报告（PoC 实测）

> 变更 `20260925-chore-milkdown-editor-poc`（issue #116）· 实测日期 2026-09-25
> 实测对象：`@milkdown/kit@7.22.2`（2026-09-23 发布的最新版），headless 默认 preset（commonmark + gfm），无 Crepe
> 实测方式：`tests/editor-poc-roundtrip.test.ts` —— 17 个真实形态样例经 Milkdown 真实 transformer 做「打开→直接保存」round-trip，全文快照入库（`tests/__snapshots__/editor-poc-roundtrip.test.ts.snap`），二次 round-trip 断言幂等性

## 结论先行

1. **全量替换：否。** 用户判据「`.md` 在 GitHub 上保持原状、字节不被影响」在架构上被 Milkdown 的 parse→re-serialize 保存模型排除；实测进一步发现两条**数据级损坏**证据（frontmatter 毁坏、图片行丢失），不是风格翻写层面的代价。
2. **第二编辑模式（保真换体验）：否。** 图片丢失 + frontmatter 毁坏使它无法作为「可保存」的模式存在；纯预览需求已由 renderPipeline（markdown-it, html:false）满足。
3. **残余动作：** 本套件与 devDependency 保留，作为上游序列化行为的回归观察哨（上游修复/劣化会直接打红快照）。

## 数据级损坏（比风格翻写严重）

### 1. frontmatter 笔记头被毁（证实上游 #1712 OPEN）

```
输入:                          输出（保存后）:
---                            ***
                               (空行)
title: 我的笔记                title: 我的笔记
date: 2026-09-25               date: 2026-09-25
tags: [随笔]                   tags: \[随笔]
---                            -----------
                               (空行)
正文第一段。                    正文第一段。
```

开头 `---` 变分隔线 `***`；三行元数据降级为普通文本；`tags: [随笔]` 被转义污染为 `tags: \[随笔]`；结尾 `---` 与元数据行组合成 **setext 二级标题**。笔记头语义完全损坏。本产品 renderPipeline 依赖 frontmatter 剥离、blog 约定带笔记头——不可用。

### 2. 图片行 round-trip 整行丢失

`![截图](./我的笔记.assets/20260925-abc.png)` 与 `![shot](./note.assets/20260925-abc.png)`（ASCII 对照组）round-trip 输出**均为空字符串**——非中文路径问题，默认 headless preset 下图片必丢。blog 的 `<stem>.assets` 相对引用约定直接**数据丢失**。（Crepe 的 image-block 组件形态未测——本次评估已按用户拍板剔除形态体验；对 headless 集成而言此行为即为默认。）

## 风格翻写清单（一次 round-trip）

| 样例 | 翻写率（变更行/总行） | 行为 |
|---|---|---|
| frontmatter 笔记头 | 9/8 (113%) | **语义损坏**（见上） |
| 图片相对引用（中/英路径） | 2/2 (100%) | **整行丢失**（见上） |
| setext 标题 | 5/5 (100%) | `===` 下划线 → `#` ATX |
| 短横列表 `- ` | 3/4 (75%) | `- ` → `* `（最常见风格被翻写） |
| 括号有序列表 `1)` | 2/3 (67%) | → `1.` |
| GFM 任务列表+表格 | 4/7 (57%) | `- [ ]` → `* [ ]`、表格对齐空格压缩 |
| 硬换行（行尾两空格） | 1/3 (33%) | → 反斜杠 `\` 形式 |
| 相邻双列表 | 1/4 (25%) | `- ` → `* ` |
| 中文正文混排（含 `- ` 列表） | 2/11 (18%) | `- ` → `* ` |
| 短横分隔线 `---` | 1/6 (17%) | → `***` |
| 转义字符 | 1/2 (50%) | `\-` 多余转义被剥为 `-` |
| 下划线强调 `_em_` | 0/2 (0%) | **保留**（milkdown 显式传 `emphasis: '_'`，与纯 remark 默认不同） |
| autolink / 嵌套强调 / 围栏代码块 / HTML 块 | 0% | 保留 |

**与 propose 阶段纯 remark 模拟的差异**：真实 transformer 比模拟**更保守**（`_em_` 保留、`*` 列表保留）——propose 时文献转述的「`*`→`-`、`*em*`→`_em_`」方向有误，已在 brief 决策段修正。但两条数据损坏是 milkdown 集成（PM 模型 + 默认 preset）特有的，纯 remark 模拟测不出来——**这正是坚持装真 transformer 实测的价值**。

## 幂等性（修正 propose 阶段的过强表述）

全部 17 样例**二次 round-trip 零差异**（断言全绿）：规范化是**一次性的**，不是「每次保存全文 diff」。首次保存把非默认风格翻写并损坏上述两类内容，之后稳定；只有文件又被外部工具改出非默认写法时才再翻一次。上游 #2349（autolink 转义翻倍）在 7.22.2 用 `?a=1&b=2` 形态**未能复现**（可能已修或需特定 URL 形态）——幂等断言正是为捕捉这类上游劣化而保留。

## 集成成本备忘（若未来强行替换，调研数据存档）

- 命令通道 + workspaceStore 双边界设计良好：消费方（EditorPanel/EditorSection/EditorCommandHost/`/editor` 页/Toolbar）零改动。
- 硬重写面 ~1290 行：MarkdownEditor/index.tsx 341、decorations.ts 288、renderTheme.ts 257、widgets.ts 222 + 相关测试；另需新写 PM schema/装饰层（对应当前 L3 装饰管线 ~767 行）。
- 上游健康度优秀（MIT、双周发版、kit 周下载 42 万、ProseMirror IME 成熟栈）——**问题从来不是工程质量，是架构目标错配：它优化「编辑体验的语义模型」，我们要求「磁盘字节即事实源」**。

## 决策与后续

- 选型维持 **CM6 源码锚定架构**（缓冲区即文件字节，装饰只改显示不改内容——字节保真是结构保证）。
- `editor.md` 知识卡回写：固化「编辑器选型必须字节保真；禁止 parse→re-serialize 型引擎作为可保存编辑面」约束。
- devDep `@milkdown/kit` 随本套件保留（不进产物 bundle），作为上游序列化行为观察哨。

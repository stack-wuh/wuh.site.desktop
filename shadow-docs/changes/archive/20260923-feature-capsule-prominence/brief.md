---
{
  "schema": "shadow-dev/v1",
  "name": "20260923-feature-capsule-prominence",
  "type": "feature",
  "scope": "renderer-ui",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260923-feature-capsule-prominence",
  "files": [
    "components/capsule/Capsule.tsx",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "shadow-docs/menu.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 50,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/50",
    "pullRequest": 51,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/51"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "345edf755ff4baa7f2e2eaf14a0d4e9b8bf9898d",
    "verifiedAt": "2026-09-22T23:50:45.645Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:51",
    "planHash": "5742bfc3135367b3b2035895aa6510de2c7670d8b4a1352f4f7def2c1d09f5e3",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "胶囊醒目化：状态信号舱重设计（26px/状态环/语义色计数/chevron）",
      "body": "",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 胶囊醒目化重设计——状态信号舱（方案 A）

## 动机
PR #49 合入后的壳层胶囊尺寸过小（高 18px / 字号 11px / 内边距 8px），视觉权重不足，用户反馈「太小、不醒目」。对照 ZCode「更改 +3 -3」chip、Claude Code 底部状态舱、Codex 计数徽标的共性解剖——**[状态图标/spinner] + [标签] + [语义色量化数字] + [展开指示]**，高度普遍 26-28px——本变更把胶囊提到同级视觉标准，交互范式对齐三个参考编辑器。

## 引用规范
- shadow-docs/knowledge/shell-chrome-design.md（壳层胶囊 Capsule 段）
  - 当前结论: 挂点契约（MainArea 右上常驻、宿主无 z-index、pointer-events 穿透、面板向下弹出）；styled-components + token 禁硬编码色；动效 150-300ms ease-out + reduced-motion；spinner 属持续状态指示非过渡动效；图标只从 components/icons 取
  - 适用 scope: components/capsule
- norms/ui-patterns.md
  - 当前结论: 语义色使用、focus ring 底线、暗黑模式全覆盖
  - 适用 scope: 全部 UI 变更

## 决策
- **选型:** 方案 A「状态信号舱」——药丸高度 18px→**26px**（内边距 0 12px/圆角 13px/标签字号 12px）；左缘**状态环**编码聚合态（空闲=静默空心点 / 有 in_progress=primary 旋转环（持续状态指示，reduced-motion 静态降级）/ 全部完成=success 实心点）+ 标签 + **mono 语义色计数**（进行中=primary、全完成=success、其余 muted）+ 右侧 `IconChevronDown` 12px 开合旋转 180°；hover 抬升（elevation-card 阴影 + border primary）。面板、挂点契约、tasks 数据契约零改动。
- **对比方案:** B 分段计数舱（左段实底色块白字计数）——对比最强但四主题下实底块侵入感重，违背壳层 chrome 的低饱和基调；C 双层进度舱（30px 双行 + 2px 进度条）——信息最多但右上悬浮位太厚、空态双行结构空洞。
- **理由:** 方案 A 与三个参考编辑器同范式；「醒目」来自语义色量化数字与状态环而非加重底色；动效预算最小（复用既有 800ms 旋转环 + 新增 150ms chevron 旋转）；全部走既有 token，四主题校验成本最低。

## 任务
### Phase 1 视觉重构（仅 components/capsule/Capsule.tsx，行为与数据契约不变）
- [x] 状态环派生与渲染：自 `taskAggregate()` 派生 idle/active/all-done 三态，替换现 inline Spinner 判定（active 旋转环保留 800ms/圈 + reduced-motion 静态降级） — `components/capsule/Capsule.tsx` — 视觉重构
- [x] 药丸化：26px 高 / 13px 圆角 / 标签 12px / mono 计数语义色 / IconChevronDown 开合旋转 180°（150ms）/ hover elevation-card + border primary — `components/capsule/Capsule.tsx` — 视觉重构
- [x] 全量验证：jitless tsc ×3 工程 + vitest 全绿 + 旧视觉残留 grep — `tests/` — 回归验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md（壳层胶囊段补视觉规格：26px 药丸/状态环三态/mono 语义色计数/chevron 指示）
- **理由:** 视觉规格属壳层 chrome 契约的一部分；写回在 release 阶段执行

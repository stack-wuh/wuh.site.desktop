---
{
  "schema": "shadow-dev/v1",
  "name": "20261105-chore-release-v111",
  "type": "chore",
  "scope": "package.json",
  "status": "published",
  "baseBranch": "main",
  "branch": "chore/20261105-chore-release-v111",
  "files": [
    "package.json"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 184,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/184"
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:184",
    "planHash": "5984d82e0794fcf4a3a976e1b6330b62fecfe68ecb26fac8552c44df45b64058",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "package.json"
      ],
      "message": "chore(release): v1.1.1 版本 bump——CI 交付链首个真实 release"
    }
  }
}
---

# v1.1.1 发版：CI/CD 交付链首个真实 release 取证

## 动机

desktop CI/CD（PR #182 门禁首建 + #183 门扩容）已合入，dispatch 演练 windows 包已远程构建成功。本变更 bump 1.1.0 → 1.1.1 并打 tag 触发首个真实 release 构建（mac dmg+zip / win nsis 上传资产）——INV-1 版本权威、INV-4 资产可发现的取证载体。

## 复杂度评级

- **评级:** S
- **理由:** 版本号 bump，纯声明式配置
- **期望验证深度:** runtime

## 引用规范

- knowledge/publish-site-sync.md / install-distribution（CLI 先例）
  - 当前结论: tag 去 v == package.json.version 由 workflow 首步断言
  - 适用 scope: package.json
  - 遵循方式: 先 bump 后 tag

## 决策

- **选型:** bump 1.1.1 + tag v1.1.1；release 构建由新 CI 接管（本机不再打包装)

## 任务

### Phase 1
- [x] version 1.1.0 → 1.1.1 — `package.json` — 编辑
- [ ] tag v1.1.1 + release published → 双平台资产挂 release（CI 接管）— 发版

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 版本轨操作

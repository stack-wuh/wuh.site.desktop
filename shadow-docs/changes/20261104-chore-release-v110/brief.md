---
{
  "schema": "shadow-dev/v1",
  "name": "20261104-chore-release-v110",
  "type": "chore",
  "scope": "package.json",
  "status": "published",
  "baseBranch": "main",
  "branch": "chore/20261104-chore-release-v110",
  "files": [
    "package.json"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 181,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/181"
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:181",
    "planHash": "5c3d52854ef806bd4f54a379c2de8530eff6f3947552e418586e81324af9ccb7",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "package.json"
      ],
      "message": "chore(release): v1.1.0 版本 bump——发布域五变更进版本轨"
    }
  }
}
---

# v1.1.0 发版：发布域五变更进版本轨

## 动机

发布域五个变更已全部合入 main 并归档（PR #176/#177/#178/#179/#180：发布同步双链、任务时间线、pod 触发面、文章下架、hooks 收敛），真实走查取证完成（blog#175 全链）。以 chore 载体承接版本 bump，沿 v1.0.0 惯例打 tag（desktop 无 CI 发布链，应用经 `npm run dist:mac` 本地打包）。

## 复杂度评级

- **评级:** S
- **理由:** 零行为契约变更——版本号 bump，纯声明式配置
- **期望验证深度:** code-read

## 引用规范

- knowledge/publish-site-sync.md
  - 当前结论: 本轮发布域变更的最终结论集（同步双链/生命周期/任务呈现）
  - 适用 scope: 全局版本
  - 遵循方式: tag 指向含全部五变更的 main

## 决策

- **选型:** bump 1.0.0 → 1.1.0（minor：新功能发布域）+ tag v1.1.0

## 任务

### Phase 1
- [x] version 1.0.0 → 1.1.0 — `package.json` — 编辑
- [ ] tag v1.1.0 于合并后 main 头 — git tag — 发版

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 版本轨操作，无新契约

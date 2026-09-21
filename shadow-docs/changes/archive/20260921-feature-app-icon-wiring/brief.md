---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-feature-app-icon-wiring",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260921-feature-app-icon-wiring",
  "files": [
    "build/icon.ico",
    "electron-builder.yml",
    "scripts/build-icon.mjs",
    "src/main/index.ts",
    "tests/icon-build.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 11,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/11",
    "pullRequest": 13,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/13"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "aa210b1c4227a205f0bffe61fd819bfdae6a8d0b",
    "verifiedAt": "2026-09-21T07:40:21.559Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:13",
    "planHash": "f14915f96bc0539d0ca7566f67991981d9bae93b1530465362c7f0b04868a9bb",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 应用图标 Windows 接线——任务栏/窗口/打包图标闭环",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n任务栏与窗口仍显示 Electron 默认图标。品牌 Dock 图标设计源（`build/icon.svg`，W 字母标，20260919-feature-brand-icon-redesign）已存在且栅格化管线完备（icon.png / icon.icns + 测试锁定），但 Windows 侧接线缺失：`BrowserWindow` 未设 icon（dev 任务栏取默认）、管线无 `icon.ico` 产物、`electron-builder.yml` 无 win 段。本变更沿用现有设计，只补齐接线。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: Dock 图标 master 与 IconLogo 几何双源同步；生成产物（png/icns）随仓库提交；脚本重跑字节可复现由 tests/icon-build.test.ts 校验\n  - 适用 scope: build, scripts（本变更只扩管线与接线，不动几何，无双源同步义务）\n\n## 决策\n- **选型:** 方案 A——自包含 ICO 打包进现有 `build:icon` 管线 + BrowserWindow 图标接线 + electron-builder win 段\n- **对比方案:** B（引入 png-to-ico 依赖：新增 devDep 只服务 Windows，与自持管线风格不符）；C（不产 ico，靠 electron-builder 从 png 隐式转换：依赖构建环境隐式行为，ico 不进版本控制、不可测）\n- **理由:** 零新依赖；ICO 容器（PNG 压缩条目，Vista+ 全支持）约 40 行可测；产物随仓库提交延续知识卡约束；dev 与打包两侧闭环\n\n## 任务\n### Phase 1\n- [ ] build-icon.mjs 新增 ICO 组包（16/24/32/48/64/128/256 七档 PNG 条目）并在 dark 变体产出 build/icon.ico — `scripts/build-icon.mjs`\n- [ ] 扩展图标产物测试：ico 魔数/条目数/尺寸表/重跑字节可复现 — `tests/icon-build.test.ts`\n### Phase 2\n- [ ] BrowserWindow 设置 icon（app.getAppPath()/build/icon.png，existsSync 守卫——打包后 build/ 不进 asar，exe 图标由 ico 承担） — `src/main/index.ts`\n- [ ] electron-builder.yml 增加 win 段（icon 显式指向 build/icon.ico） — `electron-builder.yml`\n- [ ] 生成并提交 build/icon.ico；typecheck + vitest 全绿 — `build/icon.ico`\n\n完整 brief：shadow-docs/changes/20260921-feature-app-icon-wiring/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260921-feature-app-icon-wiring\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260921-feature-app-icon-wiring/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 应用图标 Windows 接线——任务栏/窗口/打包图标闭环

## 动机
任务栏与窗口仍显示 Electron 默认图标。品牌 Dock 图标设计源（`build/icon.svg`，W 字母标，20260919-feature-brand-icon-redesign）已存在且栅格化管线完备（icon.png / icon.icns + 测试锁定），但 Windows 侧接线缺失：`BrowserWindow` 未设 icon（dev 任务栏取默认）、管线无 `icon.ico` 产物、`electron-builder.yml` 无 win 段。本变更沿用现有设计，只补齐接线。

## 引用规范
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: Dock 图标 master 与 IconLogo 几何双源同步；生成产物（png/icns）随仓库提交；脚本重跑字节可复现由 tests/icon-build.test.ts 校验
  - 适用 scope: build, scripts（本变更只扩管线与接线，不动几何，无双源同步义务）

## 决策
- **选型:** 方案 A——自包含 ICO 打包进现有 `build:icon` 管线 + BrowserWindow 图标接线 + electron-builder win 段
- **对比方案:** B（引入 png-to-ico 依赖：新增 devDep 只服务 Windows，与自持管线风格不符）；C（不产 ico，靠 electron-builder 从 png 隐式转换：依赖构建环境隐式行为，ico 不进版本控制、不可测）
- **理由:** 零新依赖；ICO 容器（PNG 压缩条目，Vista+ 全支持）约 40 行可测；产物随仓库提交延续知识卡约束；dev 与打包两侧闭环

## 任务
### Phase 1
- [x] build-icon.mjs 新增 ICO 组包（16/24/32/48/64/128/256 七档 PNG 条目）并在 dark 变体产出 build/icon.ico — `scripts/build-icon.mjs`
- [x] 扩展图标产物测试：ico 魔数/条目数/尺寸表/重跑字节可复现 — `tests/icon-build.test.ts`
### Phase 2
- [x] BrowserWindow 设置 icon（app.getAppPath()/build/icon.png，existsSync 守卫——打包后 build/ 不进 asar，exe 图标由 ico 承担） — `src/main/index.ts`
- [x] electron-builder.yml 增加 win 段（icon 显式指向 build/icon.ico） — `electron-builder.yml`
- [x] 生成并提交 build/icon.ico；typecheck + vitest 全绿 — `build/icon.ico`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 图标管线事实扩展（ico 产物、win 打包接线、dev 窗口图标守卫策略），归入该卡图标体系段落

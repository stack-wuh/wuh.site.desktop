---
title: desktop CI/CD 交付链：质量门 + release 远程构建
domain: ci
keywords: [CI, CD, workflow, quality gate, 质量门, release, 构建, dmg, nsis, electron-builder, 分支保护, required checks, frozen-lockfile, 版本权威, 资产上传]
scope:
  - .github/workflows/ci-cd.yml
  - electron-builder.yml
status: active
source:
  - changes/archive/20261104-feature-ci-release-pipeline/brief.md
  - changes/archive/20261105-feature-gate-expansion/brief.md
verified: 2026-11-05
verified-depth: runtime
verified-scope: PR #182/#183 的门自证绿（1m29s/1m13s）；v1.1.1 release 实战：windows 腿全绿+资产落 release（wuh-site-desktop.Setup.1.1.1.exe）；macos 腿 runner 排队（见「遗留」）；家族保护四仓就位（desktop/parent/cli/workflow required checks）
---

# desktop CI/CD 交付链：质量门 + release 远程构建

## 当前结论

**两段式（同构父仓 ci-cd，单体仓简化）**：①quality-gate（ubuntu，pnpm 10.23 + node 22）：lint（oxlint 1.91.0 经 npx 钉版本）→ 三 tsc → next build → vitest 全量——**门即全部校验权威，本机不承担校验**（用户 directive）；②build-release（release published + workflow_dispatch）：矩阵 macos/windows 互不遮蔽（fail-fast: false），版本权威断言（tag 去 v == package.json.version，沿 CLI 仓语义）→ next build → electron-vite build → electron-builder（target：mac dmg+zip unsigned / win nsis）→ `gh release upload` 到同 tag Release。

**家族门禁统一标准（四仓就位）**：required status checks + 不禁直推（策略 i——shadow-dev 归档/发版流直推 main 不受阻，直推的红 main 由 release 的 needs 闸门兜底拦）。required context 名：desktop/parent=`quality-gate`、cli=`test (9 矩阵)`、workflow=`gate (6 矩阵)`；父仓保留既有 review 要求（admin 越权合并为单人仓惯例）。并发组分道：release 按 tag 独占不可取消；PR/push/dispatch 按 event+ref 各自成组——**dispatch 与门共用组会把正在跑的演练取消（实测）**。

**流程冲突已裁决**：frontmatter 回写为经用户确认的显式例外（发布身份模型），只动文档头、正文零字节改动、经 store 外部注入链同步编辑器。

**实测教训（全部踩过）**：
1. **glob 未匹配炸上传**——windows 无 dmg，`dist/*.dmg` 未匹配直接报错：上传步必须 nullglob 数组 + 零匹配硬失败（兼作 INV-4 资产存在性守卫）
2. **403 Resource not accessible by integration**——build-release job 必须 `permissions: contents: write`，默认 token 只读
3. **pnpm 父 workspace 上下文**——desktop 仓内 `pnpm add` 会被父仓 workspace 截胡（husky prepare ../.. 外泄、锁写不落盘）：依赖变更必须 `--ignore-workspace`；本仓 lint 走 npx 钉版本零依赖化规避
4. **本机沙箱不可跑门**——spawn 子进程随机 SIGSEGV/被杀（vitest worker/next worker/wait-on/CLI 子进程 5+ 实例），机器门上 CI 后该痛点归零
5. **release 事件的 workflow 版本**——取自 release 的 target commit：修 workflow 后必须删 tag+release 重建（rerun 不换 workflow 版本）

## 执行约束

- 门内容变更必须经 PR（required check 自证），禁止直推改门
- 发版 = bump（chore change）→ PR 门 → merge → tag → release published；版本权威断言红即全停
- 上传步零匹配硬失败（资产存在性守卫），禁止静默跳过
- mac 包 unsigned（identity: null），用户首次打开需右键 → 打开；签名/公证待证书立项

## 适用边界

desktop 仓交付链。父仓部署链、CLI 发版链（publish-release.yml + publish.mjs）、workflow 仓治理门各自独立成卡。

## 验证方式

PR 门自证（每次 workflow 改动自动跑）；release 资产清单 = `gh release view v* --json assets`；保护状态 = `gh api repos/.../branches/main/protection`。

## 关联知识

- 父仓库 shadow-docs/knowledge/desktop-app-architecture.md（独立仓与依赖安装铁律）
- shadow-dev-workflow knowledge/install-distribution.md（windows runner 坑与安装器契约）

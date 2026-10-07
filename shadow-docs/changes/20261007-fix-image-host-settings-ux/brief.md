---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-fix-image-host-settings-ux",
  "type": "fix",
  "scope": "image-host",
  "status": "branched",
  "baseBranch": "main",
  "branch": "fix/20261007-fix-image-host-settings-ux",
  "files": [
    "components/settings/ImageHostSection.tsx",
    "lib/i18n/locales.ts",
    "src/main/oss.ts",
    "src/shared/ossKey.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "ad96e7b0631f688974eb51ef12a723ec9eeba7a2f645f15aab910348530797e6",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "components/settings/ImageHostSection.tsx",
        "lib/i18n/locales.ts",
        "shadow-docs/changes/20261007-fix-image-host-settings-ux/brief.md",
        "src/main/oss.ts",
        "src/shared/ossKey.ts"
      ],
      "message": "fix(image-host): 设置区块可用性打磨 —— 公共 Button 组件、可操作字段指引、连接测试整行反馈、目录模板实时路径示例；key 生成抽 shared（FNV-1a）供渲染层与主进程同源消费；ali-oss 缺依赖报错归一"
    }
  }
}
---

# fix(image-host): 设置区块可用性打磨 —— 公共按钮、可操作提示、整行反馈与路径示例

## 动机
用户实测反馈（截图）：①「连接测试」行把长报错（如 ali-oss 依赖缺失的裸 stack）塞进行式设置行控制列，左侧标签被压成竖排；②字段提示太弱——用户把自定义域名填进 Endpoint、把文件名前缀填进目录模板，说明现有描述没回答「去哪拿值、该填什么」；③按钮是原生 button，未用公共 Button 组件（设计语言不一致）。另 ali-oss 缺依赖时报错不可读，已在 loadAliOss 归一为可操作指引。

## 复杂度评级
- **评级:** M
- **理由:** 行为局部（一个设置区块 + 主进程错误归一），不改契约；key 生成纯逻辑抽到 shared（渲染层预览与主进程上传单一事实源），哈希由 sha256 改纯 JS FNV-1a（shared 模块必须 node-free；8 位十六进制对文件名去重碰撞空间充足，既有 key 生成测试全绿）
- **期望验证深度:** unit（既有 22 用例经转发导出回归 + i18n 三语一致性守卫）+ 实机走查

## 引用规范
- norms/ui-patterns.md、norms/interaction.md：按钮一律用公共 `components/ui/Button`（variant/size）；行式设置行右列不承载长反馈
- shadow-docs/knowledge/ui-feedback.md：长报错整行展示（ellipsis + title 看全文），role=alert
- shadow-docs/knowledge/renderer-shell-routing.md：不适用

## 决策
- **选型:** ① 保存/清除/连接测试换公共 Button（保存 default、清除 danger、测试 default）；② 连接测试结果整行 RowFeedback 展示（成功 ✓ / 失败红字省略号 + title 全文）；③ 提示改「可操作指引」：Endpoint 指明去 Bucket 概览页看且勿填域名、目录模板只填目录并给实时「将上传为：{key}」示例、AccessKey 给创建入口与最小权限建议（三语，i18n 守卫锁定）；④ key 生成抽 `src/shared/ossKey.ts`（FNV-1a 纯 JS，node-free），main/oss.ts 转发导出保持兼容
- **对比方案:** 保持 sha256 并在渲染层复刻格式做预览——两份事实源，违反单一事实源约束；缩输入框硬塞原行——治标
- **理由:** 预览示例是「用户怎么知道如何配置」的最直接回答；shared 化让预览与真实上传永不漂移

## 任务
### Phase 1
- [ ] key 生成纯逻辑抽 shared（FNV-1a）+ main/oss.ts 转发导出 + loadAliOss 缺依赖错误归一 — `src/shared/ossKey.ts`（新）、`src/main/oss.ts`
- [ ] ImageHostSection：公共 Button、整行反馈、三处字段提示、路径实时示例 — `components/settings/ImageHostSection.tsx`
- [ ] 三语提示更新（ossEndpointHint/ossPrefixHint 改写 + ossBucketHint/ossKeyIdHint/ossTestHint/ossKeyPreview 新增） — `lib/i18n/locales.ts`
- [ ] 回归：i18n + oss-upload 测试、三侧 tsc — vitest

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 区块内 UX 打磨；「SettingRow 控制列不承载长反馈」「按钮用公共组件」已是 norms/ui-patterns 既有约束的遵循，非新结论

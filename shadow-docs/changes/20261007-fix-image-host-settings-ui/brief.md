---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-fix-image-host-settings-ui",
  "type": "fix",
  "scope": "image-host",
  "status": "branched",
  "baseBranch": "main",
  "branch": "fix/20261007-fix-image-host-settings-ui",
  "files": [
    "components/settings/ImageHostSection.tsx",
    "lib/i18n/locales.ts"
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
    "planHash": "494f6007616e791cc75d7fadbc6a653b04ceb4796baaef1b63c5ced517d6bc40",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "components/settings/ImageHostSection.tsx",
        "lib/i18n/locales.ts",
        "shadow-docs/changes/20261007-fix-image-host-settings-ui/brief.md"
      ],
      "message": "fix(image-host): 设置页 AccessKey 行布局修复 —— 凭证输入独立整行并排占满、按钮上移标题行，左列说明不再被压成竖排；三语状态文案去重"
    }
  }
}
---

# fix(image-host): 设置页 AccessKey 行布局压碎修复

## 动机
刚合入的图床设置区块（#144）中，AccessKey 行把两个密码输入框 + 保存/清除按钮塞进行式设置行（SettingRow）的右侧控制列，固定 260px 宽度叠加后左列被压到近零宽，说明文字「未配置，OSS 直传不可用」渲染成一行一个字的竖排，无法阅读（用户实测截图反馈）。

## 复杂度评级
- **评级:** S
- **理由:** 纯布局与文案修复，零行为契约变更；不动共享组件 SettingRow（免波及其他设置区块），只在 ImageHostSection 内部调整结构
- **期望验证深度:** code-read（diff 走查 + tsc + 既有 i18n/渲染测试回归）

## 引用规范
- norms/ui-patterns.md、norms/interaction.md：行式设置行布局基元（SettingRow）语义——右列承载单一紧凑控件，多字段表单不适用
- shadow-docs/knowledge/ui-feedback.md：不适用（无反馈机制改动）

## 决策
- **选型:** AccessKey 凭证输入独立整行（CredsGrid：两输入框并排 flex 占满、min-width 180px 可换行），保存/清除按钮上移到标题行右侧控制列；状态说明文案去掉与行标签重复的「AccessKey」前缀（三语同步）
- **对比方案:** 缩小输入框硬塞原行——治标，窄窗口仍会压碎；改 SettingRow 组件加多字段形态——扩大契约变更面，S 级不值
- **理由:** 遵循 ui-patterns 行式布局的适用边界；改动收敛在刚交付的区块内部

## 任务
### Phase 1
- [ ] ImageHostSection 凭证行重排（CredsGrid 独立整行 + 按钮上移） — `components/settings/ImageHostSection.tsx`
- [ ] 三语状态文案去重（ossCredsConfigured / ossCredsMissing） — `lib/i18n/locales.ts`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 纯样式修复；「SettingRow 右列不承载多字段表单」如需沉淀，待 review 阶段评估并入 ui-patterns 相关卡片

/**
 * 图标注册表 —— 对齐 x.wuh.site packages/components/icons/index.tsx 的集中导出模式：
 * 业务代码只从这里取 Icon*，禁止直接 import lucide-react（统一经 <AppIcon> 渲染出口）。
 *
 * 字形为自绘 chrome 图标集（components/icons/chrome.tsx，16 网格圆帽线框 + 站点菱形母题）；
 * 分组：UI（操作）· Status（状态）· Plugin（manifest 图标白名单映射）· Brand（品牌，见 brand.tsx）。
 */
import type { PluginIconName } from '@shared/plugin'
import { GithubIcon } from '../ui/GithubIcon'
import type { IconComponent } from '../ui/AppIcon'
import {
  IconBook,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconEye,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconGitBranch,
  IconMessage,
  IconPalette,
  IconPanelCollapse,
  IconSave,
  IconSettings,
  IconSparkles,
  IconTag
} from './chrome'

export { IconDiamond, IconLogo } from './brand'

// ---------- UI：操作 ----------

export {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconPalette,
  IconPanelCollapse,
  IconSave,
  IconSettings
} from './chrome'

// ---------- Status：状态 ----------

export { IconGitBranch } from './chrome'

// ---------- Plugin：manifest 图标白名单 → 宿主同源组件（图标资源由核心自持，插件不携带） ----------

const PLUGIN_ICON_COMPONENTS: Record<PluginIconName, IconComponent> = {
  'file-text': IconFile,
  'git-branch': IconGitBranch,
  github: GithubIcon,
  tag: IconTag,
  message: IconMessage,
  eye: IconEye,
  sparkles: IconSparkles,
  book: IconBook
}

export function pluginIcon(name: PluginIconName): IconComponent {
  return PLUGIN_ICON_COMPONENTS[name]
}

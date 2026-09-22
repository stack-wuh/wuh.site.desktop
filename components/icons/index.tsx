/**
 * 图标注册表 —— 对齐 x.wuh.site packages/components/icons/index.tsx 的集中导出模式：
 * 业务代码只从这里取 Icon*，禁止直接 import lucide-react（统一经 <AppIcon> 渲染出口）。
 *
 * 分组：UI（操作）· Status（状态）· Plugin（manifest 图标白名单映射）· Brand（自绘，见 brand.tsx）。
 */
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  House,
  MessageSquare,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Search,
  Settings,
  Sparkles,
  Tag,
  X
} from 'lucide-react'
import type { PluginIconName } from '@shared/plugin'
import { GithubIcon } from '../ui/GithubIcon'
import type { IconComponent } from '../ui/AppIcon'

export { IconDiamond, IconLogo } from './brand'

// ---------- UI：操作 ----------

export const IconCheck = Check
export const IconChevronDown = ChevronDown
export const IconChevronLeft = ChevronLeft
export const IconChevronRight = ChevronRight
export const IconClose = X
export const IconCopy = Copy
export const IconExternalLink = ExternalLink
export const IconFile = FileText
export const IconFolder = Folder
export const IconFolderOpen = FolderOpen
export const IconHome = House
export const IconPalette = Palette
export const IconPanelCollapse = PanelLeftClose
export const IconPanelExpand = PanelLeftOpen
export const IconSave = Save
export const IconSearch = Search
export const IconSettings = Settings

// ---------- Status：状态 ----------

export const IconGitBranch = GitBranch

// ---------- Plugin：manifest 图标白名单 → 宿主同源组件（图标资源由核心自持，插件不携带） ----------

const PLUGIN_ICON_COMPONENTS: Record<PluginIconName, IconComponent> = {
  'file-text': FileText,
  'git-branch': GitBranch,
  github: GithubIcon,
  tag: Tag,
  message: MessageSquare,
  eye: Eye,
  sparkles: Sparkles,
  book: BookOpen
}

export function pluginIcon(name: PluginIconName): IconComponent {
  return PLUGIN_ICON_COMPONENTS[name]
}

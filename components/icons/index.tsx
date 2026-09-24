/**
 * 图标注册表 —— 对齐 x.wuh.site packages/components/icons/index.tsx 的集中导出模式：
 * 业务代码只从这里取 Icon*，禁止直接 import lucide-react（统一经 <AppIcon> 渲染出口）。
 *
 * 分组：UI（操作）· Status（状态）· Plugin（manifest 图标白名单映射）· Brand（自绘，见 brand.tsx）。
 */
import {
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Code,
  Copy,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Heading1,
  Heading2,
  House,
  Image,
  Inbox,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Maximize,
  MessageSquare,
  Minus,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Quote,
  Save,
  Search,
  Settings,
  Sparkles,
  Table,
  Tag,
  Trash2,
  TriangleAlert,
  Undo2,
  Redo2,
  X
} from 'lucide-react'
import type { PluginIconName } from '@shared/plugin'
import { GithubIcon } from '../ui/GithubIcon'
import type { IconComponent } from '../ui/AppIcon'

export { IconDiamond, IconLogo } from './brand'

// ---------- UI：操作 ----------

export const IconBold = Bold
export const IconCheck = Check
export const IconChevronDown = ChevronDown
export const IconChevronLeft = ChevronLeft
export const IconChevronRight = ChevronRight
export const IconCircleAlert = CircleAlert
export const IconCircleCheck = CircleCheck
export const IconClose = X
export const IconCode = Code
export const IconCopy = Copy
export const IconExternalLink = ExternalLink
export const IconEye = Eye
export const IconFile = FileText
export const IconFilePlus = FilePlus2
export const IconFolder = Folder
export const IconFolderOpen = FolderOpen
export const IconHeading1 = Heading1
export const IconHeading2 = Heading2
export const IconHome = House
export const IconImage = Image
export const IconInbox = Inbox
export const IconInfo = Info
export const IconItalic = Italic
export const IconLink = Link2
export const IconList = List
export const IconListOrdered = ListOrdered
export const IconListTree = ListTree
export const IconMaximize = Maximize
export const IconMinus = Minus
export const IconPalette = Palette
export const IconPanelCollapse = PanelLeftClose
export const IconPanelExpand = PanelLeftOpen
export const IconPlus = Plus
export const IconQuote = Quote
export const IconRedo = Redo2
export const IconSave = Save
export const IconSearch = Search
export const IconSettings = Settings
export const IconSparkles = Sparkles
export const IconTable = Table
export const IconTrash = Trash2
export const IconTriangleAlert = TriangleAlert
export const IconUndo = Undo2

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

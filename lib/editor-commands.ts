/**
 * 编辑器命令通道（host 侧纯逻辑）——壳层全局胶囊与编辑器实例解耦的唯一桥梁：
 * 胶囊（StatusBar，任意路由常驻）发布命令，MarkdownEditor（首页，订阅期消费）
 * 与编辑器命令宿主（文档操作）各自认领；无订阅者时发布返回 false，调用方按
 * no-op 处理（如胶囊按钮提示「编辑器未就绪」）。纯内存、可独立测试。
 */
import type { MarkdownInsertAction } from './store'

export type EditorCommand =
  /** 格式化/链接插入：复用 store 的 applyMarkdownInsert 动作词表 */
  | { kind: 'format'; action: MarkdownInsertAction }
  /** 插入片段模板（表格/代码块/分隔线），词表见 editor-info 的 INSERT_SNIPPETS */
  | { kind: 'insert'; snippet: InsertSnippetName }
  /** 从剪贴板取图落盘到当前文档 assets/ 并插入相对路径 */
  | { kind: 'insertClipboardImage' }
  /** 大纲跳转：目标为 parseOutline 序列中的序号 */
  | { kind: 'scrollToHeading'; index: number }
  /** 即时渲染 ↔ 纯源码切换（L3 渲染开关，编辑器侧持久化 wd.editorRenderMode） */
  | { kind: 'toggleRender' }
  /** 查找/替换：开合 CM6 内联搜索面板（Mod-F 同款） */
  | { kind: 'findReplace' }
  /** 撤销/重做（编辑历史栈） */
  | { kind: 'undo' }
  | { kind: 'redo' }
  /** 专注模式开合（壳层级：问候/散点图淡出、编辑区沉浸；宿主命令消费） */
  | { kind: 'toggleFocus' }
  /** 文档操作（宿主命令消费，走 workspaceStore 链） */
  | { kind: 'save' }
  | { kind: 'saveAs' }
  | { kind: 'newDraft' }
  | { kind: 'closeDoc' }
  | { kind: 'focus' }

export type InsertSnippetName = 'table' | 'codeBlock' | 'hr'

type EditorCommandHandler = (command: EditorCommand) => boolean

const handlers = new Set<EditorCommandHandler>()

/** 返回退订函数；handler 返回 true 表示该命令由己方消费 */
export function subscribeEditorCommands(handler: EditorCommandHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

/** 发布命令；任一订阅者消费即返回 true，无人订阅返回 false（no-op） */
export function publishEditorCommand(command: EditorCommand): boolean {
  let consumed = false
  handlers.forEach((handler) => {
    try {
      if (handler(command)) consumed = true
    } catch (err) {
      console.error('编辑器命令处理器异常', err)
    }
  })
  return consumed
}

export function resetEditorCommandsForTests(): void {
  handlers.clear()
}

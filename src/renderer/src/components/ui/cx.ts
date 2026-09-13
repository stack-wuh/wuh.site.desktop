/** 极简 className 拼接（避免引入类名工具依赖） */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

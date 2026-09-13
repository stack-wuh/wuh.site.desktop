import { useCallback, useEffect } from 'react'
import { useWorkspaceStore, workspaceStore } from '../store'

/** 脏状态 + 保存动作 + 关窗防丢失守卫 */
export function useDirtyState(): {
  dirty: boolean
  save: () => Promise<void>
} {
  const { dirty } = useWorkspaceStore()

  const save = useCallback(async (): Promise<void> => {
    const { activePath, content } = workspaceStore.get()
    if (!activePath || content == null) return
    await window.api.writeFile(activePath, content)
    workspaceStore.markSaved()
  }, [])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent): void => {
      if (!workspaceStore.get().dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [])

  return { dirty, save }
}

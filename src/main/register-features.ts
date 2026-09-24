import { implement, registerIpc } from './ipc'
import { getPublisher } from './publishers/types'
import { bootstrapPlugins } from './plugins/loader'

// ---- 特性模块（各自在模块加载时向 ipc 表注册实现） ----
import './workspace'
import './drafts'
import './cloneWorkspace'
import './images'
import './git'
import './gitRevert'
import './credentials'
import './github/issues'
import './github/identity'
import './uploader'
import './aboutActivity'
import './systemNotify'

// 发布目标（publisher）由插件 manifest 声明、loader 注册桥接实现（github-issues 为首个）
implement('publish', async ([req]) => {
  const publisher = getPublisher(req.publisherId)
  if (!publisher) {
    return { ok: false, error: `未知的发布目标: ${req.publisherId}` }
  }
  return publisher.publish(req)
})

/** 必须在 app.whenReady 后调用：插件扫描先于 handler 挂载（publisher 桥接需就位）。 */
export async function bootstrapIpc(): Promise<void> {
  await bootstrapPlugins()
  registerIpc()
}

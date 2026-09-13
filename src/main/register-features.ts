import { implement, registerIpc } from './ipc'
import { getPublisher } from './publishers/types'

// ---- 特性模块（各自在模块加载时向 ipc 表注册实现） ----
import './workspace'
import './images'
import './git'
import './gitRevert'
import './credentials'
import './github/issues'
import './uploader'
import './publishers/github-issues'

// publish 分发到 publisher 注册表（github-issues 为首个实现，多平台后置）
implement('publish', async ([req]) => {
  const publisher = getPublisher(req.publisherId)
  if (!publisher) {
    return { ok: false, error: `未知的发布目标: ${req.publisherId}` }
  }
  return publisher.publish(req)
})

/** 必须在 app.whenReady 后调用：实现注册先于 handler 挂载。 */
export function bootstrapIpc(): void {
  registerIpc()
}

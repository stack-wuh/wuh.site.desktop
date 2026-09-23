// publisher 贡献的插件侧实现：宿主 registry 派发的 publish 请求经能力表执行。
// GitHub API 调用与凭证注入仍由主进程完成（broker 已核验本插件 publish.register）。
// 发布过程经任务贡献点（manifest tasks: publish）上报进度——控制中心任务区
// 可见「发布 Issue」任务的进行中/完成态；失败时回到 pending 并写明原因。
// 胶囊贡献点（manifest capsule: issues，count 模板）：启动时拉取 open issue
// 计数单向上报，控制中心插件模块区可见；失败静默保留源码态（模块隐藏）。
const wuh = window.wuh
await wuh.ready

// 控制中心模块：open issue 计数（失败不打扰——模块保持隐藏，下次启停重试）
void wuh.cap
  .call('githubListIssues')
  .then((issues) => {
    const open = Array.isArray(issues) ? issues.filter((it) => it && it.state === 'open').length : 0
    return wuh.capsule.update('issues', { value: open, label: '个 open' })
  })
  .catch((err) => {
    console.warn('[github-issues] 胶囊模块上报失败（保持隐藏）', err)
  })

wuh.publisher.register('github-issues', async (req) => {
  const title = req && typeof req === 'object' && typeof req.title === 'string' ? req.title : ''
  await wuh.tasks.upsert('publish', {
    status: 'in_progress',
    detail: title ? `发布「${title}」…` : '发布中…'
  })
  try {
    const result = await wuh.cap.call('githubUpsertIssue', req)
    await wuh.tasks.upsert('publish', {
      status: 'done',
      detail: title ? `已发布「${title}」` : '发布完成'
    })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await wuh.tasks.upsert('publish', { status: 'pending', detail: `发布失败：${message}` })
    throw err
  }
})

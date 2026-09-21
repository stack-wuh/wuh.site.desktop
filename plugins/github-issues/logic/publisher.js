// publisher 贡献的插件侧实现：宿主 registry 派发的 publish 请求经能力表执行。
// GitHub API 调用与凭证注入仍由主进程完成（broker 已核验本插件 publish.register）。
// 发布过程经任务贡献点（manifest tasks: publish）上报进度——StatusBar 任务胶囊
// 可见「发布 Issue」任务的进行中/完成态；失败时回到 pending 并写明原因。
const wuh = window.wuh
await wuh.ready

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

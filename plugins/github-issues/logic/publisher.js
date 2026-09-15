// publisher 贡献的插件侧实现：宿主 registry 派发的 publish 请求经能力表执行。
// GitHub API 调用与凭证注入仍由主进程完成（broker 已核验本插件 publish.register）。
const wuh = window.wuh
await wuh.ready

wuh.publisher.register('github-issues', async (req) => {
  return await wuh.cap.call('githubUpsertIssue', req)
})

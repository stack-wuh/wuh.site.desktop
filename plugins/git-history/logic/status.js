// 胶囊贡献点（manifest capsule: status，status 模板）：逻辑帧常驻上报 Git 状态。
// 启动拉取 gitStatus 单向上报（分支 · 未提交数），文档保存/打开与工作区切换后刷新；
// 非 git 目录或能力调用失败静默保留源码态（模块保持隐藏，下次事件重试）——
// 同 github-issues 胶囊模块的「失败不打扰」惯例。doc.changed 输入流不刷（每键击一次 git 调用太抖）。
const wuh = window.wuh
await wuh.ready

async function report() {
  try {
    const s = await wuh.cap.call('gitStatus')
    if (!s || !s.branch) {
      await wuh.capsule.remove('status')
      return
    }
    const dirty = Array.isArray(s.files) ? s.files.length : 0
    const staged = dirty > 0 && Array.isArray(s.files) ? s.files.filter((f) => f && f.staged).length : 0
    const parts = [s.branch]
    if (dirty > 0) parts.push(`${dirty} 未提交`)
    const details = []
    if (staged > 0) details.push(`已暂存 ${staged}`)
    if (s.ahead > 0) details.push(`领先 ${s.ahead}`)
    if (s.behind > 0) details.push(`落后 ${s.behind}`)
    const patch = { text: parts.join(' · '), tone: dirty > 0 ? 'primary' : 'success', detail: details.join(' · ') }
    await wuh.capsule.update('status', patch)
  } catch (err) {
    console.warn('[git-history] 胶囊模块上报失败（保持隐藏）', err)
  }
}

await report()

wuh.on('doc.saved', () => { void report() })
wuh.on('doc.opened', () => { void report() })
wuh.on('workspace', () => { void report() })

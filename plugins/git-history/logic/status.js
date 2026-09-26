// 胶囊贡献点（manifest capsule: status 模板 + tabs: git 插件 Tab，20260925-feature-capsule-plugin-tab）：
// 逻辑帧常驻上报 Git 状态。启动拉取 gitStatus 单向上报（分支 · 未提交数），文档保存/打开与
// 工作区切换后刷新；非 git 目录或能力调用失败静默保留源码态（模块/Tab 保持隐藏，下次事件重试）——
// 同 github-issues 胶囊模块的「失败不打扰」惯例。doc.changed 输入流不刷（每键击一次 git 调用太抖）。
// Git Tab（tabs 声明制）：gitStatus 变更文件 ≤5（staged 前缀标记）+ gitLog 最近提交 ≤5（短哈希+主题），
// 行带 viewId 直达 /plugin/git-history/git；gitLog 失败不影响 status 模块（tab 单独降级）。
const wuh = window.wuh
await wuh.ready

const TAB_FILE_LIMIT = 5
const TAB_COMMIT_LIMIT = 5
const TAB_TEXT_LIMIT = 60

async function reportTab(s) {
  try {
    const files = (Array.isArray(s.files) ? s.files : [])
      .slice(0, TAB_FILE_LIMIT)
      .map((f) => ({
        icon: 'file-text',
        text: `${f.staged ? '[已暂存] ' : ''}${String(f.path)}`.slice(0, TAB_TEXT_LIMIT),
        detail: String(f.state || ''),
        viewId: 'git'
      }))
    const log = await wuh.cap.call('gitLog', { limit: TAB_COMMIT_LIMIT })
    const commits = (Array.isArray(log) ? log : [])
      .slice(0, TAB_COMMIT_LIMIT)
      .map((c) => ({
        text: `${c.shortHash} ${c.message}`.slice(0, TAB_TEXT_LIMIT),
        detail: c.author,
        viewId: 'git'
      }))
    const sections = []
    if (files.length > 0) sections.push({ title: '变更文件', rows: files })
    if (commits.length > 0) sections.push({ title: '最近提交', rows: commits })
    await wuh.capsule.updateTab('git', { sections })
  } catch (err) {
    console.warn('[git-history] 胶囊 Tab 上报失败（保持隐藏）', err)
    try { await wuh.capsule.removeTab('git') } catch { /* 已隐藏或未声明，忽略 */ }
  }
}

async function report() {
  try {
    const s = await wuh.cap.call('gitStatus')
    if (!s || !s.branch) {
      await wuh.capsule.remove('status')
      await wuh.capsule.removeTab('git')
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
    await reportTab(s)
  } catch (err) {
    console.warn('[git-history] 胶囊模块上报失败（保持隐藏）', err)
  }
}

await report()

wuh.on('doc.saved', () => { void report() })
wuh.on('doc.opened', () => { void report() })
wuh.on('workspace', () => { void report() })

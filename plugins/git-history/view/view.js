// Git 历史面板：状态/提交/推送/拉取 + 历史 diff 与 revert（能力经宿主 broker）。
const wuh = window.wuh
await wuh.ready

const root = document.getElementById('root')
const state = { status: null, log: [], diff: '', message: '', scope: 'all', busy: false, error: null, activePath: null }

function h(tag, cls, text) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text != null) el.textContent = text
  return el
}

function cap(method, ...args) {
  return wuh.cap.call(method, ...args)
}

async function run(fn) {
  state.busy = true
  state.error = null
  render()
  try {
    await fn()
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  } finally {
    state.busy = false
    render()
  }
}

async function refreshInner() {
  state.status = await cap('gitStatus')
  const logPath = state.scope === 'file' && state.activePath ? state.activePath : undefined
  state.log = await cap('gitLog', { path: logPath, limit: 30 })
}

async function refresh() {
  try {
    await refreshInner()
    state.error = null
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  }
  render()
}

async function commit() {
  await run(async () => {
    const msg = state.message.trim() || `docs: update ${state.activePath ?? 'workspace'}`
    const paths = state.scope === 'file' && state.activePath ? [state.activePath] : undefined
    await cap('gitCommit', msg, paths)
    state.message = ''
    await refreshInner()
  })
}

async function push() {
  await run(async () => {
    await cap('gitPush')
    await refreshInner()
  })
}

async function pull() {
  await run(async () => {
    await cap('gitPull')
    await refreshInner()
  })
}

async function revertFile() {
  await run(async () => {
    if (!state.activePath) return
    const plan = await cap('planRevert', {
      mode: 'file',
      fileDirty: false,
      fileHasUnpushedCommits: false,
      fileHasPushedCommits: false,
      path: state.activePath
    })
    if (plan.action === 'blocked') {
      state.error = plan.reason
      render()
      return
    }
    const ok = await wuh.ui.confirm({
      title: '回退文件',
      message: `确认回退「${state.activePath}」？\n${plan.reason}`,
      okText: '回退',
      danger: true
    })
    if (!ok) return
    await cap('executeRevert', plan)
    await refreshInner()
  })
}

async function revertCommit(hash) {
  await run(async () => {
    const plan = await cap('planRevert', {
      mode: 'commit',
      fileDirty: false,
      fileHasUnpushedCommits: false,
      fileHasPushedCommits: true,
      hash
    })
    if (plan.action !== 'revertCommit') {
      state.error = 'reason' in plan ? plan.reason : '无法回退'
      render()
      return
    }
    const ok = await wuh.ui.confirm({
      title: 'Revert 提交',
      message: `确认 revert 提交 ${hash.slice(0, 7)}？\n将生成一个反向提交，不改写远端历史。`,
      okText: 'Revert',
      danger: true
    })
    if (!ok) return
    await cap('executeRevert', plan)
    await refreshInner()
  })
}

async function showDiff(hash) {
  await run(async () => {
    const logPath = state.scope === 'file' && state.activePath ? state.activePath : undefined
    state.diff = await cap('gitShow', hash, logPath)
  })
}

function btn(text, cls, onClick, disabled) {
  const b = h('button', `gi-btn ${cls || ''}`.trim(), text)
  b.disabled = Boolean(disabled)
  b.addEventListener('click', () => void onClick())
  return b
}

function render() {
  root.textContent = ''
  const s = state.status

  const sec1 = h('div', 'panel-section')
  const head = h('div', 'section-head')
  head.appendChild(h('span', null, s ? `${s.branch ?? '-'} ↑${s.ahead} ↓${s.behind}` : '…'))
  const toggle = h('span', 'scope-toggle')
  const allBtn = btn('全仓', state.scope === 'all' ? 'active' : '', () => {
    state.scope = 'all'
    void refresh()
  })
  const fileBtn = btn('当前文件', state.scope === 'file' ? 'active' : '', () => {
    state.scope = 'file'
    void refresh()
  }, !state.activePath)
  toggle.appendChild(allBtn)
  toggle.appendChild(fileBtn)
  head.appendChild(toggle)
  sec1.appendChild(head)

  const commitBox = h('div', 'commit-box')
  const input = h('input')
  input.placeholder = '提交信息（留空自动生成）'
  input.value = state.message
  input.addEventListener('input', () => {
    state.message = input.value
  })
  commitBox.appendChild(input)
  commitBox.appendChild(btn('Commit', 'primary', commit, state.busy))
  sec1.appendChild(commitBox)

  const actions = h('div', 'row-actions')
  actions.appendChild(btn('Push ↑', '', push, state.busy))
  actions.appendChild(btn('Pull ↓', '', pull, state.busy))
  actions.appendChild(btn('回退当前文件', 'danger', revertFile, state.busy || !state.activePath))
  sec1.appendChild(actions)

  if (state.error) sec1.appendChild(h('div', 'error-text', state.error))
  if (s && s.files.length > 0) {
    const ul = h('ul', 'status-list')
    for (const f of s.files) {
      const li = h('li', f.state, `${f.path} · ${f.state}`)
      ul.appendChild(li)
    }
    sec1.appendChild(ul)
  }
  root.appendChild(sec1)

  const sec2 = h('div', 'panel-section')
  const head2 = h('div', 'section-head')
  head2.appendChild(h('span', null, `历史${state.scope === 'file' && state.activePath ? ` · ${state.activePath}` : ''}`))
  sec2.appendChild(head2)
  if (state.log.length === 0) {
    sec2.appendChild(h('div', 'placeholder', '暂无提交历史'))
  } else {
    const ul = h('ul', 'log-list')
    for (const c of state.log) {
      const li = h('li')
      const line = h('div', 'log-line')
      line.appendChild(h('code', null, c.shortHash))
      const msg = h('span', 'log-msg', c.message)
      msg.title = c.message
      line.appendChild(msg)
      line.appendChild(btn('diff', 'ghost', () => showDiff(c.hash)))
      line.appendChild(btn('revert', 'ghost', () => revertCommit(c.hash)))
      li.appendChild(line)
      ul.appendChild(li)
    }
    sec2.appendChild(ul)
  }
  if (state.diff) sec2.appendChild(h('pre', 'diff-view', state.diff))
  root.appendChild(sec2)
}

// 文件历史直达：跟随宿主当前文档——有文档自动切 file scope 展示该文件历史，
// 无文档回 all scope；手动 scope 切换仍可在两次文档切换间使用。
function followDoc(path) {
  state.activePath = path
  state.scope = path ? 'file' : 'all'
  void refresh()
}

wuh.on('doc.opened', async () => {
  const doc = await wuh.document.get()
  followDoc(doc.path)
})

wuh.on('doc.closed', async () => {
  const doc = await wuh.document.get()
  followDoc(doc.path)
})

{
  const doc = await wuh.document.get()
  state.activePath = doc.path
  if (doc.path) state.scope = 'file'
}
void refresh()

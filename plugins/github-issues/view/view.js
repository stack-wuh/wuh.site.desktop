// GitHub 面板：Issues（发布/更新当前文档）、标签、评论三个页签。
// 编排逻辑在插件侧（toPublishFields 语义移植自站点发布规范），
// API 调用与凭证由主进程能力表完成。
import { parseFrontmatter } from './fm-util.js'

const wuh = window.wuh
await wuh.ready

const root = document.getElementById('root')

// ---------- 发布字段提取（等价原 shared/frontmatter.toPublishFields） ----------
function toPublishFields(raw) {
  const { data, body } = parseFrontmatter(raw)
  const { title, labels, summary, cover, keywords, ...rest } = data ?? {}
  const metadata = { ...rest }
  if (summary !== undefined) metadata.summary = summary
  if (cover !== undefined) metadata.cover = cover
  if (keywords !== undefined) metadata.keywords = keywords
  return {
    title: title ?? '',
    labels: Array.isArray(labels) ? labels : [],
    body,
    metadata: Object.keys(metadata).length > 0 ? metadata : {}
  }
}

// ---------- 面板状态 ----------
const state = {
  tab: 'issues',
  issues: [],
  labels: [],
  comments: [],
  selected: null,
  draftLabel: '',
  draftColor: '#5b9bf5',
  draftComment: '',
  error: null,
  msg: null,
  busy: false,
  docPath: null,
  docContent: null
}

function h(tag, cls, text) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text != null) el.textContent = text
  return el
}

function btn(text, cls, onClick, disabled) {
  const b = h('button', `gh-btn ${cls || ''}`.trim(), text)
  b.disabled = Boolean(disabled)
  b.addEventListener('click', () => void onClick())
  return b
}

async function refreshIssues() {
  try {
    state.issues = await wuh.cap.call('githubListIssues')
    state.error = null
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  }
}

async function refreshLabels() {
  try {
    state.labels = await wuh.cap.call('githubListLabels')
    state.error = null
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  }
}

async function loadComments(n) {
  try {
    state.comments = await wuh.cap.call('githubGetIssueComments', n)
    state.error = null
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  }
}

async function publish() {
  if (!state.docPath || state.docContent == null) return
  state.busy = true
  state.msg = null
  state.error = null
  render()
  try {
    const fields = toPublishFields(state.docContent)
    const existing = state.issues.find((i) => i.title === fields.title)
    const res = await wuh.cap.call('publish', {
      publisherId: 'github-issues',
      filePath: state.docPath,
      title: fields.title,
      labels: fields.labels,
      body: fields.body,
      metadata: fields.metadata,
      issueNumber: existing ? existing.number : undefined
    })
    if (res.ok) {
      state.msg = `${existing ? '已更新' : '已发布'} Issue #${res.issueNumber}：${res.url ?? ''}`
      await refreshIssues()
    } else {
      state.error = res.error ?? '发布失败'
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  } finally {
    state.busy = false
    render()
  }
}

async function upsertLabel() {
  if (!state.draftLabel.trim()) return
  state.busy = true
  try {
    await wuh.cap.call('githubUpsertLabel', {
      name: state.draftLabel.trim(),
      color: state.draftColor,
      description: null
    })
    state.draftLabel = ''
    await refreshLabels()
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  } finally {
    state.busy = false
    render()
  }
}

async function removeLabel(name) {
  const ok = await wuh.ui.confirm({ title: '删除标签', message: `删除标签「${name}」？`, okText: '删除', danger: true })
  if (!ok) return
  state.busy = true
  try {
    await wuh.cap.call('githubDeleteLabel', name)
    await refreshLabels()
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  } finally {
    state.busy = false
    render()
  }
}

async function sendComment() {
  if (state.selected == null || !state.draftComment.trim()) return
  state.busy = true
  try {
    await wuh.cap.call('githubAddIssueComment', state.selected, state.draftComment.trim())
    state.draftComment = ''
    await loadComments(state.selected)
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  } finally {
    state.busy = false
    render()
  }
}

// ---------- 渲染 ----------
function renderIssuesTab() {
  const wrap = h('div', 'issues-panel')
  const actions = h('div', 'row-actions')
  const missingTitle = state.docPath != null && state.docContent != null && toPublishFields(state.docContent).title === ''
  actions.appendChild(btn('发布/更新当前文档为 Issue', 'primary', publish, state.busy || !state.docPath || missingTitle))
  actions.appendChild(btn('刷新', '', async () => {
    await refreshIssues()
    render()
  }, state.busy))
  wrap.appendChild(actions)
  if (state.msg) wrap.appendChild(h('div', 'ok-text', state.msg))
  if (state.issues.length === 0 && !state.error) wrap.appendChild(h('div', 'placeholder', '当前仓库没有打开的 Issue'))
  const ul = h('ul', 'issue-list')
  for (const i of state.issues) {
    const li = h('li')
    li.appendChild(h('span', 'issue-num', `#${i.number}`))
    li.appendChild(h('span', 'issue-title', i.title))
    const labels = h('span', 'issue-labels')
    for (const l of i.labels) labels.appendChild(h('em', null, l))
    li.appendChild(labels)
    ul.appendChild(li)
  }
  if (state.issues.length > 0) wrap.appendChild(ul)
  if (missingTitle) wrap.appendChild(h('div', 'hint-text', '当前文档缺少 frontmatter title，发布前请先在 Frontmatter 面板补全。'))
  return wrap
}

function renderLabelsTab() {
  const wrap = h('div', 'labels-panel')
  const create = h('div', 'label-create')
  const nameInput = h('input')
  nameInput.placeholder = '标签名'
  nameInput.value = state.draftLabel
  nameInput.addEventListener('input', () => {
    state.draftLabel = nameInput.value
  })
  const colorInput = h('input')
  colorInput.type = 'color'
  colorInput.value = state.draftColor
  colorInput.setAttribute('aria-label', '标签颜色')
  colorInput.addEventListener('input', () => {
    state.draftColor = colorInput.value
  })
  create.appendChild(nameInput)
  create.appendChild(colorInput)
  create.appendChild(btn('保存', 'primary', upsertLabel, state.busy || !state.draftLabel.trim()))
  wrap.appendChild(create)
  if (state.labels.length === 0 && !state.error) wrap.appendChild(h('div', 'placeholder', '仓库还没有标签，输入名称后保存即可创建'))
  const ul = h('ul', 'label-list')
  for (const l of state.labels) {
    const li = h('li')
    const tag = h('span', 'tag', l.name)
    tag.style.background = `#${l.color}22`
    tag.style.borderColor = `#${l.color}`
    tag.style.color = `#${l.color}`
    li.appendChild(tag)
    li.appendChild(btn('删除', 'ghost', () => removeLabel(l.name), state.busy))
    ul.appendChild(li)
  }
  if (state.labels.length > 0) wrap.appendChild(ul)
  return wrap
}

function renderCommentsTab() {
  const wrap = h('div', 'comments-panel')
  const select = h('select')
  for (const i of state.issues) {
    const opt = h('option', null, `#${i.number} ${i.title}`)
    opt.value = String(i.number)
    if (state.selected === i.number) opt.selected = true
    select.appendChild(opt)
  }
  select.addEventListener('change', async () => {
    state.selected = Number(select.value)
    await loadComments(state.selected)
    render()
  })
  wrap.appendChild(select)
  if (state.comments.length === 0 && !state.error) wrap.appendChild(h('div', 'placeholder', '暂无评论，选中 Issue 后可直接回复'))
  const ul = h('ul', 'comment-list')
  for (const c of state.comments) {
    const li = h('li')
    const head = h('div', 'comment-head')
    head.appendChild(h('strong', null, c.user))
    head.appendChild(h('time', null, new Date(c.createdAt).toLocaleString()))
    li.appendChild(head)
    li.appendChild(h('div', 'comment-body', c.body))
    ul.appendChild(li)
  }
  if (state.comments.length > 0) wrap.appendChild(ul)
  const editor = h('div', 'comment-editor')
  const ta = h('textarea')
  ta.rows = 3
  ta.placeholder = '回复该 Issue…（Markdown）'
  ta.value = state.draftComment
  ta.addEventListener('input', () => {
    state.draftComment = ta.value
  })
  editor.appendChild(ta)
  editor.appendChild(btn('发送', 'primary', sendComment, state.busy || !state.draftComment.trim() || state.selected == null))
  wrap.appendChild(editor)
  return wrap
}

function render() {
  root.textContent = ''
  const tabs = h('div', 'tab-bar')
  for (const [id, label] of [['issues', 'Issues'], ['labels', '标签'], ['comments', '评论']]) {
    tabs.appendChild(btn(label, state.tab === id ? 'active' : 'ghost', async () => {
      state.tab = id
      if (id === 'labels') await refreshLabels()
      render()
    }, state.busy))
  }
  root.appendChild(tabs)
  if (state.error) root.appendChild(h('div', 'error-text', state.error))
  if (state.tab === 'issues') root.appendChild(renderIssuesTab())
  if (state.tab === 'labels') root.appendChild(renderLabelsTab())
  if (state.tab === 'comments') root.appendChild(renderCommentsTab())
}

// ---------- 初始化：先拉 Issue 列表（默认选中第一个进入评论上下文） ----------
async function loadDoc() {
  const doc = await wuh.document.get()
  state.docPath = doc.path
  state.docContent = doc.content
  render()
}

await refreshIssues()
if (state.issues.length > 0) state.selected = state.issues[0].number
wuh.on('doc.opened', () => void loadDoc())
wuh.on('doc.saved', async () => {
  const doc = await wuh.document.get()
  state.docPath = doc.path
  state.docContent = doc.content
})
await loadDoc()

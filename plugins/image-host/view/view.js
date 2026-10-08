// 图床面板：本地目录/文件选择 → 上传队列 → 逐文件进度 → markdown 链接复制。
// 上传编排在逻辑帧（logic/upload.js），本帧经事件总线下发命令、接收进度；
// picker/listImages/clipboardWrite 直接走能力代理（权限经 manifest 声明 + 宿主批准）。
const wuh = window.wuh
await wuh.ready

await wuh.events.subscribe(['image-host:*'])

const root = document.getElementById('root')

const state = {
  items: [], // { path, name, status: pending|uploading|ok|fail, url, error }
  prefix: '',
  recentPrefixes: [], // 常用前缀下拉（帧内会话历史，最新在前 ≤8；设置只读通道无特例，见 plugin-architecture 卡）
  uploading: false,
  summary: null, // { total, okCount, failCount }
  error: null
}

function h(tag, cls, text) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text != null) el.textContent = text
  return el
}

function cap(method, ...args) {
  return wuh.cap.call(method, ...args)
}

function baseName(p) {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(idx + 1) : p
}

function nameOf(item) {
  return baseName(item.path)
}

function addPaths(paths) {
  for (const p of paths) {
    if (state.items.some((item) => item.path === p)) continue
    state.items.push({ path: p, name: baseName(p), status: 'pending', url: null, error: null })
  }
}

async function pickFiles() {
  state.error = null
  const res = await cap('pickImages')
  if (res && res.canceled === false && Array.isArray(res.paths)) {
    addPaths(res.paths)
    render()
  }
}

async function pickDir() {
  state.error = null
  const res = await cap('pickDirectory')
  if (res && res.canceled === false && typeof res.path === 'string') {
    try {
      const files = await cap('listImages', res.path)
      if (Array.isArray(files) && files.length > 0) {
        addPaths(files)
      } else {
        state.error = '目录中没有图片文件'
      }
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err)
    }
    render()
  }
}

function startUpload() {
  const paths = state.items.filter((item) => item.status === 'pending' || item.status === 'fail').map((i) => i.path)
  if (paths.length === 0 || state.uploading) return
  const used = state.prefix.trim()
  if (used) {
    state.recentPrefixes = [used, ...state.recentPrefixes.filter((p) => p !== used)].slice(0, 8)
  }
  state.uploading = true
  state.summary = null
  state.error = null
  for (const item of state.items) {
    if (paths.includes(item.path)) item.status = 'uploading'
  }
  void wuh.events.publish('start', { paths, prefix: state.prefix.trim() || null })
  render()
}

function clearQueue() {
  if (state.uploading) return
  state.items = []
  state.summary = null
  state.error = null
  render()
}

async function copyMarkdown() {
  const lines = state.items.filter((item) => item.ok && item.url).map((item) => `![](${item.url})`)
  if (lines.length === 0) return
  try {
    await cap('clipboardWrite', lines.join('\n'))
    await wuh.ui.toast({ text: `已复制 ${lines.length} 条 markdown 链接` })
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
    render()
  }
}

async function copyUrl(item) {
  if (!item.url) return
  try {
    await cap('clipboardWrite', item.url)
    await wuh.ui.toast({ text: '链接已复制' })
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
    render()
  }
}

function onEvent(env) {
  if (!env || typeof env.type !== 'string') return
  if (env.type === 'image-host:progress') {
    const p = env.payload || {}
    if (p.done === 0 && p.total === 0 && p.error) {
      state.error = p.error
      render()
      return
    }
    const item = state.items.find((i) => i.path === p.path)
    if (item) {
      item.status = p.ok ? 'ok' : 'fail'
      item.url = p.url || null
      item.error = p.error || null
    }
    render()
    return
  }
  if (env.type === 'image-host:finish') {
    state.uploading = false
    state.summary = env.payload || null
    render()
  }
}

wuh.on('event', onEvent)

function render() {
  root.textContent = ''

  // 上传来源
  const source = h('div', 'panel-section')
  const sourceHead = h('div', 'section-head', null)
  sourceHead.appendChild(h('span', null, '选择图片'))
  source.appendChild(sourceHead)
  const actionRow = h('div', 'action-row')
  const pickFilesBtn = h('button', null, '选择文件')
  pickFilesBtn.addEventListener('click', () => void pickFiles())
  const pickDirBtn = h('button', null, '选择目录')
  pickDirBtn.addEventListener('click', () => void pickDir())
  const clearBtn = h('button', null, '清空')
  clearBtn.disabled = state.uploading || state.items.length === 0
  clearBtn.addEventListener('click', clearQueue)
  actionRow.append(pickFilesBtn, pickDirBtn, clearBtn)
  source.appendChild(actionRow)
  source.appendChild(h('p', 'hint', '批量上传请用「选择目录」；文件与目录都来自系统原生弹窗。'))
  root.appendChild(source)

  // 目标前缀 + 上传
  const target = h('div', 'panel-section')
  const targetHead = h('div', 'section-head', null)
  targetHead.appendChild(h('span', null, '目标（可选 OSS 目录）'))
  target.appendChild(targetHead)
  const prefixRow = h('div', 'prefix-row')
  const prefixInput = h('input')
  prefixInput.placeholder = '如 blog/2026-10，留空用默认配置'
  prefixInput.value = state.prefix
  prefixInput.addEventListener('input', () => {
    state.prefix = prefixInput.value
  })
  // 常用前缀下拉（原生 datalist 组合框：可选历史、仍可自由输入）
  const prefixList = h('datalist')
  prefixList.id = 'image-host-prefix-presets'
  for (const p of state.recentPrefixes) {
    const opt = document.createElement('option')
    opt.value = p
    prefixList.appendChild(opt)
  }
  prefixInput.setAttribute('list', prefixList.id)
  prefixRow.appendChild(prefixInput)
  prefixRow.appendChild(prefixList)
  const uploadBtn = h('button', 'primary', state.uploading ? '上传中…' : '上传')
  uploadBtn.disabled =
    state.uploading || state.items.every((item) => item.status !== 'pending' && item.status !== 'fail')
  uploadBtn.addEventListener('click', startUpload)
  prefixRow.appendChild(uploadBtn)
  target.appendChild(prefixRow)
  root.appendChild(target)

  // 队列
  const queueSection = h('div', 'panel-section')
  const queueHead = h('div', 'section-head', null)
  queueHead.appendChild(h('span', null, `队列（${state.items.length}）`))
  queueSection.appendChild(queueHead)
  if (state.items.length === 0) {
    queueSection.appendChild(h('p', 'empty', '还没有选择图片'))
  } else {
    const list = h('ul', 'queue')
    for (const item of state.items) {
      const li = h('li')
      li.title = item.path
      li.appendChild(h('span', 'name', item.name))
      if (item.status === 'ok') {
        li.appendChild(h('span', 'state ok', '已上传'))
        const copyBtn = h('button', 'copy', '复制')
        copyBtn.addEventListener('click', () => void copyUrl(item))
        li.appendChild(copyBtn)
      } else if (item.status === 'fail') {
        const failMark = h('span', 'state fail', '失败')
        if (item.error) failMark.title = item.error
        li.appendChild(failMark)
      } else if (item.status === 'uploading') {
        li.appendChild(h('span', 'state uploading', '上传中'))
      } else {
        li.appendChild(h('span', 'state', '待上传'))
      }
      list.appendChild(li)
    }
    queueSection.appendChild(list)
    if (state.uploading) {
      const done = state.items.filter((i) => i.status === 'ok' || i.status === 'fail').length
      const bar = h('div', 'progressbar')
      const fill = h('div', 'fill')
      fill.style.width = `${Math.round((done / state.items.length) * 100)}%`
      bar.appendChild(fill)
      queueSection.appendChild(bar)
    }
  }
  root.appendChild(queueSection)

  // 结果
  if (state.summary) {
    const resultSection = h('div', 'panel-section')
    const summary = h('p', 'summary')
    summary.textContent = `完成：成功 ${state.summary.okCount} / 失败 ${state.summary.failCount}`
    if (state.summary.failCount > 0) {
      const failMark = h('span', 'fail', '（失败项已保留在队列，可直接重传）')
      summary.appendChild(failMark)
    }
    resultSection.appendChild(summary)
    const okCount = state.items.filter((i) => i.ok && i.url).length
    const copyAllBtn = h('button', 'primary', '复制 Markdown 链接')
    copyAllBtn.disabled = okCount === 0
    copyAllBtn.addEventListener('click', () => void copyMarkdown())
    resultSection.appendChild(copyAllBtn)
    root.appendChild(resultSection)
  }

  if (state.error) {
    root.appendChild(h('div', 'error-text', state.error))
  }
}

render()

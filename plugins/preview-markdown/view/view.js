// 预览视图：订阅文档事件，把正文交给宿主渲染管线，展示 HTML。
const wuh = window.wuh
await wuh.ready

const out = document.getElementById('out')
let rendering = false
let queued = false

function fail(text) {
  out.textContent = ''
  const div = document.createElement('div')
  div.className = 'error-text'
  div.textContent = `渲染失败：${text}`
  out.appendChild(div)
}

async function refresh() {
  const doc = await wuh.document.get()
  if (!doc.path || doc.content == null) {
    out.textContent = ''
    const div = document.createElement('div')
    div.className = 'placeholder'
    div.textContent = '预览区（打开文档后实时渲染）'
    out.appendChild(div)
    return
  }
  if (rendering) {
    queued = true
    return
  }
  rendering = true
  try {
    const res = await wuh.render.render(doc.content)
    out.innerHTML = res.html
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  } finally {
    rendering = false
    if (queued) {
      queued = false
      void refresh()
    }
  }
}

for (const evt of ['doc.opened', 'doc.changed', 'doc.saved', 'doc.closed']) {
  wuh.on(evt, () => void refresh())
}

// 链接点击 → 宿主代开外部浏览器（与旧预览行为一致）
out.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('a') : null
  if (a && a.href) {
    e.preventDefault()
    void wuh.ui.openExternal(a.href)
  }
})

void refresh()

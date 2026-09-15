// Frontmatter 结构化表单：应用时仅重写文档头部，正文不动（与旧宿主面板行为一致）。
import { parseFrontmatter, stringifyFrontmatter, toComma, fromComma } from './fm-util.js'

const wuh = window.wuh
await wuh.ready

const root = document.getElementById('root')
const FIELDS = [
  { key: 'title', label: '标题', comma: false },
  { key: 'labels', label: '标签', comma: true, placeholder: '逗号分隔' },
  { key: 'summary', label: '摘要', comma: false },
  { key: 'cover', label: '封面', comma: false },
  { key: 'keywords', label: '关键词', comma: true, placeholder: '逗号分隔' }
]

let draft = {}
const inputs = new Map()

function build() {
  root.textContent = ''
  for (const f of FIELDS) {
    const row = document.createElement('div')
    row.className = 'fm-row'
    const label = document.createElement('label')
    label.textContent = f.label
    const input = document.createElement('input')
    if (f.placeholder) input.placeholder = f.placeholder
    input.addEventListener('input', () => {
      draft[f.key] = f.comma ? fromComma(input.value) : input.value
    })
    inputs.set(f.key, { input, field: f })
    row.appendChild(label)
    row.appendChild(input)
    root.appendChild(row)
  }
  const actions = document.createElement('div')
  actions.className = 'fm-actions'
  const apply = document.createElement('button')
  apply.className = 'fm-btn primary'
  apply.textContent = '应用到文档'
  apply.addEventListener('click', () => void applyDraft())
  actions.appendChild(apply)
  root.appendChild(actions)
}

function syncInputs() {
  for (const [key, { input, field }] of inputs) {
    input.value = field.comma ? toComma(draft[key]) : toComma(draft[key] == null ? '' : draft[key])
  }
}

async function applyDraft() {
  const doc = await wuh.document.get()
  if (!doc.path || doc.content == null) return
  const { body } = parseFrontmatter(doc.content)
  await wuh.document.set(stringifyFrontmatter(draft, body))
}

async function loadDoc() {
  const doc = await wuh.document.get()
  if (!doc.path || doc.content == null) {
    draft = {}
    syncInputs()
    root.classList.add('empty')
    return
  }
  root.classList.remove('empty')
  // 仅在切换文件时重置草稿，编辑过程中保留用户输入
  draft = parseFrontmatter(doc.content).data
  syncInputs()
}

build()
wuh.on('doc.opened', () => void loadDoc())
wuh.on('doc.closed', () => void loadDoc())
await loadDoc()

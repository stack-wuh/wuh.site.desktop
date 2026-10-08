// Frontmatter 结构化表单：应用时仅重写文档头部，正文不动。
// 三语文案经宿主 ui.locale 帧服务初读 + locale 事件热切换
//（20261007-feature-frontmatter-editor-hide：编辑器渲染态隐藏文档头后，
// 本视图是结构化信息展示与修改的唯一入口）。
import { parseFrontmatter, stringifyFrontmatter, toComma, fromComma, suggestTitle } from './fm-util.js'

const wuh = window.wuh
await wuh.ready

const LEX = {
  zh: {
    title: '标题',
    labels: '标签',
    summary: '摘要',
    cover: '封面',
    keywords: '关键词',
    comma: '逗号分隔',
    apply: '应用到文档',
    applied: '已应用到文档',
    failed: '应用失败',
    emptyNoDoc: '打开一个文档后可编辑文档信息',
    emptyNoFm: '本文档暂无文档信息',
    create: '创建',
    untitled: '未命名'
  },
  en: {
    title: 'Title',
    labels: 'Labels',
    summary: 'Summary',
    cover: 'Cover',
    keywords: 'Keywords',
    comma: 'comma separated',
    apply: 'Apply to document',
    applied: 'Applied to document',
    failed: 'Apply failed',
    emptyNoDoc: 'Open a document to edit its info',
    emptyNoFm: 'This document has no info yet',
    create: 'Create',
    untitled: 'Untitled'
  },
  ja: {
    title: 'タイトル',
    labels: 'ラベル',
    summary: '概要',
    cover: 'カバー',
    keywords: 'キーワード',
    comma: 'カンマ区切り',
    apply: 'ドキュメントに適用',
    applied: 'ドキュメントに適用しました',
    failed: '適用に失敗しました',
    emptyNoDoc: 'ドキュメントを開すと情報を編集できます',
    emptyNoFm: 'このドキュメントに情報はありません',
    create: '作成',
    untitled: '無題'
  }
}

const FIELDS = [
  { key: 'title', comma: false },
  { key: 'labels', comma: true, placeholder: 'comma' },
  { key: 'summary', comma: false },
  { key: 'cover', comma: false },
  { key: 'keywords', comma: true, placeholder: 'comma' }
]

const root = document.getElementById('root')
let locale = 'zh'
let draft = {}
let hasDoc = false
let hasFm = false
const inputs = new Map()

function lex() {
  return LEX[locale] ?? LEX.zh
}

function fileNameOf(path) {
  return (path || '').split(/[/\\]/).pop() || ''
}

function build() {
  root.textContent = ''
  inputs.clear()
  const empty = !hasFm
  root.classList.toggle('empty', empty)

  if (empty) {
    const hint = document.createElement('div')
    hint.className = 'fm-empty-hint'
    hint.textContent = hasDoc ? lex().emptyNoFm : lex().emptyNoDoc
    root.appendChild(hint)
    if (hasDoc) {
      const actions = document.createElement('div')
      actions.className = 'fm-actions'
      const create = document.createElement('button')
      create.className = 'fm-btn primary'
      create.textContent = lex().create
      create.addEventListener('click', () => void createFm())
      actions.appendChild(create)
      root.appendChild(actions)
    }
    return
  }

  for (const f of FIELDS) {
    const row = document.createElement('div')
    row.className = 'fm-row'
    const label = document.createElement('label')
    label.textContent = lex()[f.key]
    const input = document.createElement('input')
    if (f.placeholder) input.placeholder = lex()[f.placeholder]
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
  apply.textContent = lex().apply
  apply.addEventListener('click', () => void applyDraft())
  actions.appendChild(apply)
  root.appendChild(actions)
  syncInputs()
}

function syncInputs() {
  for (const [key, { input, field }] of inputs) {
    input.value = field.comma ? toComma(draft[key]) : toComma(draft[key] == null ? '' : draft[key])
  }
}

async function applyDraft() {
  try {
    const doc = await wuh.document.get()
    if (!doc.path || doc.content == null) return
    const { body } = parseFrontmatter(doc.content)
    await wuh.document.set(stringifyFrontmatter(draft, body))
    await wuh.ui.toast({ text: lex().applied, kind: 'success' })
  } catch (err) {
    await wuh.ui.toast({ text: `${lex().failed}: ${String((err && err.message) || err)}`, kind: 'error' })
  }
}

async function createFm() {
  try {
    const doc = await wuh.document.get()
    if (!doc.path || doc.content == null) return
    const { body } = parseFrontmatter(doc.content)
    const title = suggestTitle(body, fileNameOf(doc.path)) || lex().untitled
    await wuh.document.set(stringifyFrontmatter({ title }, body))
    await wuh.ui.toast({ text: lex().applied, kind: 'success' })
    await loadDoc()
  } catch (err) {
    await wuh.ui.toast({ text: `${lex().failed}: ${String((err && err.message) || err)}`, kind: 'error' })
  }
}

async function loadDoc() {
  const doc = await wuh.document.get()
  hasDoc = Boolean(doc.path) && doc.content != null
  if (!hasDoc) {
    draft = {}
    hasFm = false
    build()
    return
  }
  const data = parseFrontmatter(doc.content).data
  // 仅在切换文件时重置草稿（编辑过程中保留用户输入由 loadDoc 触发时机保证）
  draft = data
  hasFm = Object.keys(data).length > 0
  build()
}

async function initLocale() {
  try {
    const l = await wuh.locale()
    if (l && LEX[l]) locale = l
  } catch {
    // 帧服务不可用时保持默认语言
  }
}

await initLocale()
wuh.on('locale', (payload) => {
  const l = payload && payload.locale
  if (l && LEX[l]) {
    locale = l
    build()
  }
})
build()
wuh.on('doc.opened', () => void loadDoc())
wuh.on('doc.closed', () => void loadDoc())
await loadDoc()

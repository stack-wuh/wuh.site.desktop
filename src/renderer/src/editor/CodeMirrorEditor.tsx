import { useEffect, useMemo, useRef } from 'react'
import {
  EditorState,
  RangeSetBuilder,
  StateField,
  type Extension,
  type Text
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  keymap,
  type DecorationSet
} from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { Prec, indentUnit } from '@codemirror/language'

interface Props {
  /** 初始内容；key=docPath 保证换文件时整体重建 */
  initialValue: string
  docPath: string
  onChange: (value: string) => void
  onSave: () => void
}

function base64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

async function pickImageFile(dt: DataTransfer): Promise<File | null> {
  for (const item of dt.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile()
      if (f) return f
    }
  }
  if (dt.files.length > 0 && dt.files[0].type.startsWith('image/')) {
    return dt.files[0]
  }
  return null
}

async function insertPastedImage(
  file: File,
  view: EditorView,
  docPath: string
): Promise<void> {
  const base64 = base64FromArrayBuffer(await file.arrayBuffer())
  const saved = await window.api.savePastedImage(
    docPath,
    file.name || `image-${Date.now()}.png`,
    base64
  )
  const alt = (file.name || 'image').replace(/\.[a-zA-Z0-9]+$/, '')
  const snippet = `![${alt}](${saved.markdownRef})`
  view.dispatch(view.state.replaceSelection(snippet), { scrollIntoView: true })
}

/** 粘贴/拖拽图片 → 主进程落盘 .assets → 插入相对链接 */
function imageTransferExtension(docPath: string): Extension {
  return EditorView.domEventHandlers({
    paste: (event, view) => {
      const dt = event.clipboardData
      if (!dt) return false
      void pickImageFile(dt).then((img) => {
        if (img) {
          event.preventDefault()
          return insertPastedImage(img, view, docPath)
        }
        return undefined
      })
      return false
    },
    drop: (event, view) => {
      const dt = event.dataTransfer
      if (!dt) return false
      void pickImageFile(dt).then((img) => {
        if (img) {
          event.preventDefault()
          return insertPastedImage(img, view, docPath)
        }
        return undefined
      })
      return false
    }
  })
}

// ---------- frontmatter 行高亮 ----------
const frontmatterLine = Decoration.line({ class: 'cm-frontmatter' })

function buildFrontmatterDeco(doc: Text): DecorationSet {
  if (doc.lines < 2 || doc.line(1).text.trim() !== '---') {
    return Decoration.none
  }
  const builder = new RangeSetBuilder<Decoration>()
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n)
    builder.add(line.from, 0, frontmatterLine)
    if (n > 1 && line.text.trim() === '---') break
  }
  return builder.finish()
}

const frontmatterField = StateField.define<DecorationSet>({
  create: (state) => buildFrontmatterDeco(state.doc),
  update: (deco, tr) => (tr.docChanged ? buildFrontmatterDeco(tr.state.doc) : deco),
  provide: (f) => EditorView.decorations.from(f)
})

export function CodeMirrorEditor(props: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onChangeRef = useRef(props.onChange)
  const onSaveRef = useRef(props.onSave)
  onChangeRef.current = props.onChange
  onSaveRef.current = props.onSave

  const extensions = useMemo<Extension[]>(
    () => [
      basicSetup,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      indentUnit.of('  '),
      frontmatterField,
      imageTransferExtension(props.docPath),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              onSaveRef.current()
              return true
            }
          }
        ])
      ),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      })
    ],
    // docPath 固定（key 重建），依赖仅初始化
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (!containerRef.current) return
    const state = EditorState.create({
      doc: props.initialValue,
      selection: { anchor: 0 },
      extensions
    })
    const view = new EditorView({ parent: containerRef.current, state })
    return () => view.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="codemirror-host" ref={containerRef} />
}

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCAN_ROOTS = ['app', 'components', 'lib']
// 渲染层相对导入 ≤1 级：./ 同目录与单级 ../ 域内互引合法，≥2 级走 @/ 或 @shared/ 别名
const DEEP_RELATIVE = new RegExp(String.raw`from\s*['"](?:\.\./){2,}[^'"]*['"]`, 'g')

function collectFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(p, acc)
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(p)
  }
  return acc
}

function scanDeepRelativeImports() {
  return SCAN_ROOTS.flatMap((root) =>
    collectFiles(join(appRoot, root)).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(DEEP_RELATIVE)].map(
        (hit) => `${relative(appRoot, file)}: ${hit[0]}`
      )
    )
  )
}

describe('import boundary（渲染层相对导入层数）', () => {
  it('app/components/lib 下相对导入 ≤1 级（≥2 级须用 @/ 或 @shared/ 别名）', () => {
    expect(scanDeepRelativeImports()).toEqual([])
  })

  it('守卫自检：≥2 级识别为违规，单级放行', () => {
    const deep = "import { x } from '../../lib/nope'"
    expect([...deep.matchAll(DEEP_RELATIVE)]).toHaveLength(1)
    const single = "import { x } from '../lib/ok'"
    expect([...single.matchAll(DEEP_RELATIVE)]).toHaveLength(0)
  })
})

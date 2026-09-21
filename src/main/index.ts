import { BrowserWindow, Menu, app, net, protocol, shell, type MenuItemConstructorOptions } from 'electron'
import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isAllowedTopNavigation } from './navigationGuard'
import { bootstrapIpc } from './register-features'
import { PRIVILEGED_SCHEMES } from './schemes'

const isDev = !app.isPackaged
/** dev 渲染层地址（next dev，见 package.json dev 脚本双进程编排） */
const DEV_RENDERER_URL = process.env['NEXT_DEV_URL'] ?? 'http://localhost:3000'

// 应用菜单仅承载编辑快捷键角色（Ctrl+C/V/Z 等系统输入依赖菜单角色）；
// 窗口内不显示菜单栏（见 createWindow 的 setMenu(null)）。dev 下附带回退/开发者工具。
const devExtras: MenuItemConstructorOptions[] = isDev
  ? [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }]
  : []
const appMenu = Menu.buildFromTemplate([
  {
    label: app.name,
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
      ...devExtras
    ]
  }
])
Menu.setApplicationMenu(appMenu)

// 自定义协议特权注册（逐条 scheme 的取舍见 ./schemes）：不走关闭 webSecurity 的路线，dev/prod 行为一致
protocol.registerSchemesAsPrivileged(PRIVILEGED_SCHEMES)

// __dirname = <appRoot>/out/main；Next 导出根 = <appRoot>/dist/next
const RENDERER_DIST = resolve(__dirname, '../../dist/next')

// app:// 路径解析：/settings 依次尝试 settings、settings.html、settings/index.html
// （Next 导出默认 trailingSlash=false 产出 .html 文件）。resolve 后前缀校验防目录穿越。
function resolveRendererFile(pathname: string): string | null {
  const rel = decodeURIComponent(pathname).replace(/^\//, '')
  const candidates = rel === '' ? ['index.html'] : [rel, `${rel}.html`, `${rel}/index.html`]
  for (const candidate of candidates) {
    const abs = resolve(RENDERER_DIST, candidate)
    if (!abs.startsWith(RENDERER_DIST)) continue
    if (!existsSync(abs) || !statSync(abs).isFile()) continue
    return abs
  }
  return null
}

function createWindow(): BrowserWindow {
  // dev 下从源码 build/ 取窗口/任务栏图标；打包后 build/ 不进 asar，由 exe 资源（win.icon / icns）承担
  const iconPath = join(app.getAppPath(), 'build/icon.png')
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: 'wuh.site',
    icon: existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  // Windows/Linux：不渲染系统菜单栏（快捷键角色仍由应用菜单生效）
  win.setMenu(null)

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // 顶层导航白名单：页面内容（含沙箱插件帧）不得把宿主窗口导航到壳层之外。
  // loadURL 发起的导航不触发本事件，故不会波及壳层自身的加载路径。
  win.webContents.on('will-navigate', (event, url) => {
    if (isAllowedTopNavigation(url, { isDev, devUrl: DEV_RENDERER_URL })) return
    console.warn('已拦截顶层导航:', url)
    event.preventDefault()
  })

  if (isDev) {
    // 主进程自旋等待 dev 就绪，避免 next dev 未起时白屏竞态
    const waitForDevServer = async (): Promise<boolean> => {
      for (let i = 0; i < 120; i++) {
        try {
          await net.fetch(DEV_RENDERER_URL)
          return true
        } catch {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
      return false
    }
    void waitForDevServer().then((ready) => {
      if (ready) void win.loadURL(DEV_RENDERER_URL)
      else win.loadURL('data:text/html,<h1 style="font-family:sans-serif">next dev 未就绪（60s 超时）</h1>')
    })
  } else {
    void win.loadURL('app://shell/index.html')
  }
  return win
}

app.whenReady().then(() => {
  protocol.handle('local-resource', (request) => {
    try {
      const { host, pathname } = new URL(request.url)
      // URL 形如 local-resource:///Users/..，host 为空、pathname 为绝对路径
      const abs = decodeURIComponent(`${host}${pathname}`)
      if (!abs.startsWith('/')) return new Response('bad request', { status: 400 })
      return net.fetch(pathToFileURL(abs).toString())
    } catch {
      return new Response('not found', { status: 404 })
    }
  })

  protocol.handle('app', (request) => {
    try {
      const { pathname } = new URL(request.url)
      const abs = resolveRendererFile(pathname)
      if (!abs) return new Response('not found', { status: 404 })
      return net.fetch(pathToFileURL(abs).toString())
    } catch {
      return new Response('not found', { status: 404 })
    }
  })

  bootstrapIpc()
    .catch((err) => {
      // 插件引导失败不阻塞窗口：宿主功能照常，渲染层按空插件注册表运行
      console.error('bootstrapIpc failed:', err)
    })
    .finally(() => {
      createWindow()
    })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

import { BrowserWindow, Menu, app, net, protocol, shell, type MenuItemConstructorOptions } from 'electron'
import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bootstrapIpc } from './register-features'

const isDev = !app.isPackaged

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

// 预览渲染本地图片用的安全协议：不走 webSecurity 关闭路线，dev/prod 行为一致。
// standard+secure+corsEnabled：插件视图运行在 secure 的 plugin:// 帧中，
// 跨源加载本地图片需要协议本身具备可信源与 CORS 资格（否则混合内容拦截）。
// plugin://<id>：插件静态资源与沙箱帧加载协议（standard+secure，供 opaque 帧 fetch）
// app://<host>/<path>：Next 静态导出产物（dist/next）离线加载协议，standard+secure
// 使其成为可信源，与 plugin:// 沙箱帧的 CSP/混合内容规则兼容
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-resource',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  },
  { scheme: 'plugin', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  }
])

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

  if (isDev) {
    // dev 渲染层由 `next dev`(3000) 提供（见 package.json dev 脚本双进程编排）；
    // 主进程自旋等待就绪，避免 next dev 未起时白屏竞态
    const devUrl = process.env['NEXT_DEV_URL'] ?? 'http://localhost:3000'
    const waitForDevServer = async (): Promise<boolean> => {
      for (let i = 0; i < 120; i++) {
        try {
          await net.fetch(devUrl)
          return true
        } catch {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
      return false
    }
    void waitForDevServer().then((ready) => {
      if (ready) void win.loadURL(devUrl)
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

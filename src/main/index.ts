import { BrowserWindow, app, net, protocol, shell } from 'electron'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bootstrapIpc } from './register-features'

const isDev = !app.isPackaged

// 预览渲染本地图片用的安全协议：不走 webSecurity 关闭路线，dev/prod 行为一致
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { supportFetchAPI: true, stream: true } }
])

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: 'wuh-site desktop',
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(resolve(__dirname, '../renderer/index.html'))
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

  bootstrapIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

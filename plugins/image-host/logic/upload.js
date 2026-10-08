// 图床助手逻辑帧：上传编排（20261007-feature-image-host-plugin）。
// 视图经事件总线下发 image-host:start 命令（paths + 可选 prefix），本帧逐文件调用
// uploadImages（白名单校验与 uploadMode 路由都在主进程，路径必须来自 picker 登记），
// 每完成一个文件广播 image-host:progress，全部结束广播 image-host:finish（只带汇总，
// 明细由 progress 逐条推送，避开 4KB 事件载荷上限）。
// 插件事件由宿主按订阅广播到本插件全部帧，视图帧同信道接收进度。
const wuh = window.wuh
await wuh.ready

await wuh.events.subscribe(['image-host:*'])

let running = false

async function publish(name, payload) {
  try {
    await wuh.events.publish(name, payload)
  } catch (err) {
    console.warn('[image-host] 事件发布失败', err)
  }
}

// 任务中心上报（20261008-feature-image-upload-choice）：批量上传是跨面板的后台动作，
// 进度经运行时动态任务聚合到壳层胶囊（首报带 title 创建；后续 patch 不再带 title）。
const TASK_ID = 'batch-upload'
async function reportTask(patch) {
  try {
    if (wuh.tasks && typeof wuh.tasks.upsert === 'function') await wuh.tasks.upsert(TASK_ID, patch)
  } catch (err) {
    console.warn('[image-host] 任务上报失败', err)
  }
}

function baseName(p) {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(idx + 1) : p
}

async function uploadOne(path, prefix) {
  try {
    const batch = await wuh.cap.call('uploadImages', [path], prefix ? { prefix } : undefined)
    if (Array.isArray(batch) && batch[0]) return batch[0]
    return { ok: false, error: '上传能力无返回' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function runUpload(payload) {
  if (running) {
    await publish('progress', { done: 0, total: 0, path: null, ok: false, error: '已有上传任务在进行中' })
    return
  }
  const paths = Array.isArray(payload && payload.paths)
    ? payload.paths.filter((p) => typeof p === 'string')
    : []
  const prefix = typeof payload.prefix === 'string' && payload.prefix.trim() ? payload.prefix.trim() : null
  if (paths.length === 0) {
    await publish('finish', { total: 0, okCount: 0, failCount: 0 })
    return
  }
  running = true
  let okCount = 0
  let failCount = 0
  await reportTask({
    title: '图床批量上传',
    status: 'in_progress',
    progress: { current: 0, total: paths.length },
    detail: prefix ? `前缀 ${prefix}` : null
  })
  try {
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
      const result = await uploadOne(path, prefix)
      if (result.ok) okCount += 1
      else failCount += 1
      await publish('progress', {
        done: i + 1,
        total: paths.length,
        path,
        ok: result.ok === true,
        url: typeof result.url === 'string' ? result.url : null,
        error: typeof result.error === 'string' ? result.error : null
      })
      await reportTask({
        status: 'in_progress',
        progress: { current: i + 1, total: paths.length },
        detail: result.ok ? `已传 ${baseName(path)}` : `失败 ${baseName(path)}`
      })
    }
  } finally {
    running = false
    await publish('finish', { total: paths.length, okCount, failCount })
    await reportTask({
      status: 'done',
      progress: { current: paths.length, total: paths.length },
      detail: `成功 ${okCount} · 失败 ${failCount}`
    })
  }
}

wuh.on('event', (env) => {
  if (env && env.type === 'image-host:start') void runUpload(env.payload)
})

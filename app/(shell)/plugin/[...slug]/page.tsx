import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PluginManifest } from '@shared/plugin'
import { PluginMainView } from '../../../../components/plugins/PluginMainView'

/**
 * 插件 main 视图路由段（/plugin/<pluginId>/<viewId>）。
 * 静态导出下动态路由必须构建期枚举：从内置插件 manifest 收集全部 main 视图；
 * 运行时有效性由渲染层注册表裁决（停用/未命中 → Empty 兜底）。
 */
export function generateStaticParams(): Array<{ slug: string[] }> {
  const pluginsDir = resolve(process.cwd(), 'plugins')
  if (!existsSync(pluginsDir)) return []
  const params: Array<{ slug: string[] }> = []
  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifestPath = resolve(pluginsDir, entry.name, 'plugin.json')
    if (!existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PluginManifest
      for (const view of manifest.views ?? []) {
        if (view.area === 'main') params.push({ slug: [manifest.id, view.id] })
      }
    } catch {
      // 无效 manifest 由主进程 validateManifest 兜底报告，此处不阻塞导出
    }
  }
  return params
}

export default async function Page({
  params
}: {
  params: Promise<{ slug: string[] }>
}): Promise<React.JSX.Element> {
  const { slug } = await params
  return <PluginMainView pluginId={slug[0] ?? ''} viewId={slug[1] ?? ''} />
}

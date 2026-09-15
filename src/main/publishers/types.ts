import type { PublishRequest, PublishResult } from '@shared/types'

/**
 * 多平台发布适配器接口（第一期仅 GitHub Issues 实现；
 * 微信公众号 / Notion / 知乎等后置实现）。
 */
export interface Publisher {
  id: string
  label: string
  isAvailable(): Promise<boolean>
  publish(req: PublishRequest): Promise<PublishResult>
}

const registry = new Map<string, Publisher>()

export function registerPublisher(p: Publisher): void {
  registry.set(p.id, p)
}

/** 插件启用状态变化时用于移除桥接 publisher */
export function unregisterPublisher(id: string): void {
  registry.delete(id)
}

export function getPublisher(id: string): Publisher | undefined {
  return registry.get(id)
}

export function listPublishers(): Publisher[] {
  return [...registry.values()]
}

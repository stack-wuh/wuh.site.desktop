/**
 * 受特权自定义协议表：本进程所有自定义协议的声明点。
 *
 * 必须在 app ready 前交给 protocol.registerSchemesAsPrivileged，且注册结果
 * 直接决定渲染层能否通过帧、脚本与 fetch 访问这些协议——独立成纯数据模块，
 * 便于用测试锁定该契约（缺一位特权即全局不可用，且现场只在帧内 DevTools 可见）。
 */
import type { CustomScheme } from 'electron'
import { PLUGIN_SCHEME } from '@shared/plugin'

/** 预览渲染本地图片用：路径前缀校验承担越界防护，不关闭 webSecurity */
export const LOCAL_RESOURCE_SCHEME = 'local-resource'
/** Next 静态导出产物（dist/next）的离线加载协议 */
export const APP_SCHEME = 'app'

export const PRIVILEGED_SCHEMES: CustomScheme[] = [
  {
    scheme: LOCAL_RESOURCE_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  },
  {
    scheme: PLUGIN_SCHEME,
    // corsEnabled 是帧可达性前提，不是可选项：插件视图运行在 sandbox="allow-scripts" 的
    // 不透明源帧（origin: null），帧内 <script type="module">、SDK 下发与逻辑入口 import()
    // 全为 CORS 模式的跨源请求。缺此位则脚本被 "Cross origin requests are only supported
    // for protocol schemes" 拦下，表现为帧导航成功、握手永不就绪（宿主 5s 超时）
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  },
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  }
]

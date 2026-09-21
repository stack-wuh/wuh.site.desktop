declare global {
  interface Window {
    api: import('@shared/types').DesktopApi
    pluginApi: import('@shared/plugin').PluginHostApi
  }
}

export {}

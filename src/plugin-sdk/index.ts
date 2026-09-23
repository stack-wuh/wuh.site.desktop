/**
 * 插件 SDK：交付给沙箱 iframe 的运行时。
 *
 * 以纯 JS 源码字符串形式打包进主进程 bundle，经 `plugin://<id>/@core/sdk.js`
 * 虚拟路径下发（无独立构建步骤，dev/prod 一致）。插件（含官方参考插件）
 * 只依赖本文件暴露的 `window.wuh`，禁止访问 window.parent / 宿主 DOM。
 *
 * 消息协议见 src/shared/plugin.ts 的 ToHostMessage / ToFrameMessage。
 */
import type { IpcResult } from '../shared/types'
import type { PluginPermission } from '../shared/plugin'

export const PLUGIN_SDK_JS = `(function () {
  if (window.wuh) return;
  var port = null;
  var seq = 0;
  var pending = {};
  var eventHandlers = {};
  var rules = {};
  var publishers = {};
  var info = { pluginId: null, manifest: null, permissions: [], frame: null, theme: null };
  var resolveReady = null;
  var ready = new Promise(function (res) { resolveReady = res; });

  function nextId() { seq += 1; return 'r' + seq; }

  function call(service, method, args) {
    if (!port) return Promise.reject(new Error('插件运行时未连接宿主'));
    var id = nextId();
    return new Promise(function (res, rej) {
      pending[id] = { res: res, rej: rej };
      port.postMessage({ kind: 'invoke', id: id, service: service, method: method, args: args || [] });
    });
  }

  function onPort(e) {
    var m = e.data;
    if (!m || !m.kind) return;
    if (m.kind === 'result') {
      var p = pending[m.id];
      if (!p) return;
      delete pending[m.id];
      if (m.ok) p.res(m.data); else p.rej(new Error(m.error || '调用失败'));
    } else if (m.kind === 'event') {
      if (m.name === 'hello') {
        var h = m.payload || {};
        info.pluginId = h.pluginId || null;
        info.manifest = h.manifest || null;
        info.permissions = h.permissions || [];
        info.frame = h.frame || null;
        applyTheme(h.theme);
        resolveReady();
        port.postMessage({ kind: 'ready' });
      }
      var list = eventHandlers[m.name];
      if (list) list.slice().forEach(function (cb) { try { cb(m.payload); } catch (err) { console.error(err); } });
    } else if (m.kind === 'request') {
      handleRequest(m);
    }
  }

  function applyTheme(theme) {
    if (!theme) return;
    var style = document.getElementById('wuh-theme');
    if (!style) {
      style = document.createElement('style');
      style.id = 'wuh-theme';
      document.head.appendChild(style);
    }
    style.textContent = theme.css || '';
    var root = document.documentElement;
    Object.keys(theme.attrs || {}).forEach(function (k) { root.setAttribute(k, theme.attrs[k]); });
  }

  function handleRequest(m) {
    function done(ok, data, error) {
      port.postMessage({ kind: 'response', id: m.id, ok: ok, data: data, error: error });
    }
    Promise.resolve()
      .then(function () {
        if (m.service === 'renderRule') {
          var rule = rules[m.args[0]];
          if (!rule) throw new Error('未知渲染规则');
          var fn = rule[m.method === 'preprocess' ? 'preprocess' : 'postRender'];
          if (typeof fn !== 'function') return m.method === 'preprocess' ? m.args[1] : m.args[1];
          return Promise.resolve(fn(m.args[1]));
        }
        if (m.service === 'publisher') {
          var handler = publishers[m.args[0]];
          if (!handler) throw new Error('未注册的 publisher: ' + m.args[0]);
          return Promise.resolve(handler(m.args[1]));
        }
        throw new Error('未知请求服务: ' + m.service);
      })
      .then(function (data) { done(true, data, undefined); })
      .catch(function (err) { done(false, undefined, err instanceof Error ? err.message : String(err)); });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (d && d.kind === 'wuh:connect' && e.ports && e.ports[0]) {
      port = e.ports[0];
      port.onmessage = onPort;
      port.start();
    }
  });

  var api = {
    ready: ready,
    info: info,
    can: function (permission) { return info.permissions.indexOf(permission) >= 0; },
    on: function (name, cb) {
      (eventHandlers[name] = eventHandlers[name] || []).push(cb);
      return function () { api.off(name, cb); };
    },
    off: function (name, cb) {
      var list = eventHandlers[name] || [];
      var i = list.indexOf(cb);
      if (i >= 0) list.splice(i, 1);
    },
    cap: {
      call: function (method) {
        var args = Array.prototype.slice.call(arguments, 1);
        return call('cap', method, args);
      }
    },
    document: {
      get: function () { return call('doc', 'get'); },
      set: function (content) { return call('doc', 'set', [content]); },
      save: function () { return call('doc', 'save'); }
    },
    render: {
      render: function (text) { return call('render', 'execute', [text]); },
      registerRule: function (rule) {
        return call('render', 'register', [{ order: rule.order || 100, preprocess: !!rule.preprocess, postRender: !!rule.postRender }])
          .then(function (token) {
            rules[token] = rule;
            return { dispose: function () { delete rules[token]; return call('render', 'unregister', [token]); } };
          });
      }
    },
    ui: {
      confirm: function (opts) { return call('ui', 'confirm', [opts]); },
      openExternal: function (url) { return call('ui', 'openExternal', [url]); }
    },
    statusBar: {
      update: function (id, patch) { return call('statusBar', 'update', [id, patch || {}]); },
      remove: function (id) { return call('statusBar', 'remove', [id]); }
    },
    tasks: {
      upsert: function (id, patch) { return call('tasks', 'upsert', [id, patch || {}]); },
      remove: function (id) { return call('tasks', 'remove', [id]); }
    },
    capsule: {
      update: function (id, data) { return call('capsule', 'update', [id, data || {}]); },
      remove: function (id) { return call('capsule', 'remove', [id]); }
    },
    publisher: {
      register: function (id, handler) { publishers[id] = handler; }
    }
  };
  window.wuh = api;

  window.__startLogic = function (entryUrl) {
    return ready.then(function () { return import(entryUrl); }).catch(function (err) {
      console.error('插件逻辑入口加载失败', err);
    });
  };
})();`;

/** 类型面与上面 JS 源码保持同步（tsc 校验用，不发布给插件） */
export interface PluginDocumentState {
  path: string | null
  content: string | null
  saved: string | null
  dirty: boolean
  root: string | null
}

export interface WuhApi {
  ready: Promise<void>
  info: {
    pluginId: string | null
    manifest: { id: string; name: string; version: string } | null
    permissions: PluginPermission[]
    frame: string | null
  }
  can(permission: PluginPermission): boolean
  on(name: string, cb: (payload: unknown) => void): () => void
  off(name: string, cb: (payload: unknown) => void): void
  cap: {
    call<T = unknown>(method: string, ...args: unknown[]): Promise<T>
  }
  document: {
    get(): Promise<PluginDocumentState>
    set(content: string): Promise<void>
    save(): Promise<void>
  }
  render: {
    render(text: string): Promise<{ html: string }>
    registerRule(rule: {
      order?: number
      preprocess?(text: string): string | Promise<string>
      postRender?(html: string): string | Promise<string>
    }): Promise<{ dispose(): Promise<void> }>
  }
  ui: {
    confirm(opts: { title?: string; message: string; okText?: string; cancelText?: string; danger?: boolean }): Promise<boolean>
    openExternal(url: string): Promise<void>
  }
  statusBar: {
    /** 更新 manifest 声明的状态项内容（未声明的 id 会被宿主拒绝） */
    update(id: string, patch?: { text?: string; title?: string }): Promise<void>
    /** 隐藏 manifest 声明的状态项 */
    remove(id: string): Promise<void>
  }
  tasks: {
    /** 更新 manifest 声明的任务状态（未声明的 id 会被宿主拒绝） */
    upsert(
      id: string,
      patch?: {
        status?: 'pending' | 'in_progress' | 'done'
        progress?: { current: number; total: number }
        detail?: string
      }
    ): Promise<void>
    /** 隐藏 manifest 声明的任务 */
    remove(id: string): Promise<void>
  }
  capsule: {
    /**
     * 更新 manifest 声明的胶囊模块内容（未声明的 id / 模板不符的数据会被宿主拒绝）：
     * count 模板传 { value, label?, detail? }；status 模板传 { text, tone?, detail? }
     */
    update(
      id: string,
      data?: {
        value?: number
        label?: string
        text?: string
        tone?: 'default' | 'primary' | 'success' | 'warning'
        detail?: string
      }
    ): Promise<void>
    /** 隐藏 manifest 声明的胶囊模块 */
    remove(id: string): Promise<void>
  }
  publisher: {
    register(id: string, handler: (req: unknown) => Promise<IpcResult<unknown>>): void
  }
}

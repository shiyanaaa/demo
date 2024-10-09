const vueRE = /App\.vue$/
import { parseVueRequest } from './tools'
import path$a, { dirname, resolve as resolve$1 } from 'node:path'
import fs$8 from 'node:fs'
import fsp from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'
import { setViteServerContext } from '@vue/devtools-kit'
import { createViteServerRpc } from '@vue/devtools-core'
import sirv from 'sirv'
import Inspect from 'vite-plugin-inspect'
const devtoolsOptionsImportee = 'virtual:vue-devtools-options1'
const resolvedDevtoolsOptions = `\0${devtoolsOptionsImportee}`
const devtoolsNextResourceSymbol = '?__vue-devtools-next-resource'
const virtualToolsPath = 'virtual:vue-devtools-path1:'
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x
}
// var out = FastGlob
// const fg = /*@__PURE__*/ getDefaultExportFromCjs(out)
let enabled = true
let supportLevel = 2
let options = {
  enabled,
  supportLevel
}
const inspect = Inspect({
  silent: true
})
const DIR_DIST =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))
const DIR_CLIENT = resolve$1(DIR_DIST, '../client/dist/')
function kolorist(start: number, end: number, level = 1 /* ansi */) {
  const open = `\x1b[${start}m`
  const close = `\x1b[${end}m`
  const regex = new RegExp(`\\x1b\\[${end}m`, 'g')
  return (str: string) => {
    return options.enabled && options.supportLevel >= level
      ? open + ('' + str).replace(regex, open) + close
      : '' + str
  }
}
const bold = kolorist(1, 22)
const dim = kolorist(2, 22)
const green = kolorist(32, 39)
const yellow = kolorist(33, 39)
const cyan = kolorist(36, 39)
function getVueDevtoolsPath() {
  const pluginPath = normalizePath(path$a.dirname(fileURLToPath(import.meta.url)))
  return pluginPath.replace(/\/dist$/, '//src')
}
function removeUrlQuery(url: string) {
  return url.replace(/\?.*$/, '')
}
const toggleComboKeysMap = {
  option: process.platform === 'darwin' ? 'Option(\u2325)' : 'Alt(\u2325)',
  meta: 'Command(\u2318)',
  shift: 'Shift(\u21E7)'
} as any
function normalizeComboKeyPrint(toggleComboKey: string) {
  return toggleComboKey
    .split('-')
    .map((key) => toggleComboKeysMap[key] || key[0].toUpperCase() + key.slice(1))
    .join(dim('+'))
}
const defaultOptions = {
  appendTo: '',
  componentInspector: true,
  launchEditor: process.env.LAUNCH_EDITOR ?? 'code'
}
function normalizeString(path, allowAboveRoot) {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let char = null
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index]
    } else if (char === '/') {
      break
    } else {
      char = '/'
    }
    if (char === '/') {
      if (lastSlash === index - 1 || dots === 1);
      else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res[res.length - 1] !== '.' ||
          res[res.length - 2] !== '.'
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf('/')
            if (lastSlashIndex === -1) {
              res = ''
              lastSegmentLength = 0
            } else {
              res = res.slice(0, lastSlashIndex)
              lastSegmentLength = res.length - 1 - res.lastIndexOf('/')
            }
            lastSlash = index
            dots = 0
            continue
          } else if (res.length > 0) {
            res = ''
            lastSegmentLength = 0
            lastSlash = index
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? '/..' : '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`
        } else {
          res = path.slice(lastSlash + 1, index)
        }
        lastSegmentLength = index - lastSlash - 1
      }
      lastSlash = index
      dots = 0
    } else if (char === '.' && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//
function normalizeWindowsPath(input = '') {
  if (!input) {
    return input
  }
  return input.replace(/\\/g, '/').replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase())
}
function cwd() {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    return process.cwd().replace(/\\/g, '/')
  }
  return '/'
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/
const isAbsolute = function (p) {
  return _IS_ABSOLUTE_RE.test(p)
}
const resolve = function (...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument))
  let resolvedPath = ''
  let resolvedAbsolute = false
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd()
    if (!path || path.length === 0) {
      continue
    }
    resolvedPath = `${path}/${resolvedPath}`
    resolvedAbsolute = isAbsolute(path)
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute)
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`
  }
  return resolvedPath.length > 0 ? resolvedPath : '.'
}
function getAssetsFunctions(ctx) {
  const { server, config } = ctx
  const _imageMetaCache = /* @__PURE__ */ new Map()
  let cache = null
  async function scan() {
    const dir = resolve(config.root)
    const baseURL = config.base
    const publicDir = config.publicDir
    const relativePublicDir = publicDir === '' ? '' : `${relative(dir, publicDir)}/`
    const files = await fg(
      [
        // image
        '**/*.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff)',
        // video
        '**/*.(mp4|webm|ogv|mov|avi|flv|wmv|mpg|mpeg|mkv|3gp|3g2|m2ts|vob|ogm|ogx|rm|rmvb|asf|amv|divx|m4v|svi|viv|f4v|f4p|f4a|f4b)',
        // audio
        '**/*.(mp3|wav|ogg|flac|aac|wma|alac|ape|ac3|dts|tta|opus|amr|aiff|au|mid|midi|ra|rm|wv|weba|dss|spx|vox|tak|dsf|dff|dsd|cda)',
        // font
        '**/*.(woff2?|eot|ttf|otf|ttc|pfa|pfb|pfm|afm)',
        // text
        '**/*.(json|json5|jsonc|txt|text|tsx|jsx|md|mdx|mdc|markdown|yaml|yml|toml)',
        // wasm
        '**/*.wasm'
      ],
      {
        cwd: dir,
        onlyFiles: true,
        caseSensitiveMatch: false,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/package-lock.*',
          '**/pnpm-lock.*',
          '**/pnpm-workspace.*'
        ]
      }
    )
    cache = await Promise.all(
      files.map(async (relativePath) => {
        const filePath = resolve(dir, relativePath)
        const stat = await fsp.lstat(filePath)
        const path = relativePath.replace(relativePublicDir, '')
        return {
          path,
          relativePath,
          publicPath: join(baseURL, path),
          filePath,
          type: guessType(relativePath),
          size: stat.size,
          mtime: stat.mtimeMs
        }
      })
    )
    return cache
  }
  async function getAssetImporters(url) {
    const importers = []
    const moduleGraph = server.moduleGraph
    const module = await moduleGraph.getModuleByUrl(url)
    if (module) {
      for (const importer of module.importers) {
        importers.push({
          url: importer.url,
          id: importer.id
        })
      }
    }
    return importers
  }
  const debouncedAssetsUpdated = debounce(() => {
    getViteRpcServer?.()?.broadcast?.emit('assetsUpdated')
  }, 100)
  server.watcher.on('all', (event) => {
    if (event !== 'change') debouncedAssetsUpdated()
  })
  return {
    async getStaticAssets() {
      return await scan()
    },
    async getAssetImporters(url) {
      return await getAssetImporters(url)
    },
    async getImageMeta(filepath) {
      if (_imageMetaCache.has(filepath)) return _imageMetaCache.get(filepath)
      try {
        const meta = imageMeta(await fsp.readFile(filepath))
        _imageMetaCache.set(filepath, meta)
        return meta
      } catch (e) {
        _imageMetaCache.set(filepath, void 0)
        console.error(e)
        return void 0
      }
    },
    async getTextAssetContent(filepath, limit = 300) {
      try {
        const content = await fsp.readFile(filepath, 'utf-8')
        return content.slice(0, limit)
      } catch (e) {
        console.error(e)
        return void 0
      }
    }
  }
}

function getConfigFunctions(ctx) {
  return {
    getRoot() {
      return ctx.config.root
    }
  }
}

function getGraphFunctions(ctx) {
  const { rpc, server } = ctx
  const debouncedModuleUpdated = debounce(() => {
    getViteRpcServer?.()?.broadcast?.emit('graphModuleUpdated')
  }, 100)
  server.middlewares.use((_, __, next) => {
    debouncedModuleUpdated()
    next()
  })
  return {
    async getGraphModules() {
      const list = await rpc.list()
      const modules = list?.modules || []
      return modules
    }
  }
}
function getRpcFunctions(ctx) {
  return {
    heartbeat() {
      return true
    },
    ...getAssetsFunctions(ctx),
    ...getConfigFunctions(ctx),
    ...getGraphFunctions(ctx)
  }
}
export default function vueTools() {
  const pluginOptions = defaultOptions
  return {
    name: 'transform-file',
    enforce: 'pre',
    // 应用模式 (只在开发模式应用)
    apply: 'serve',
    async resolveId(importee: string) {
      //   console.log('resolveId', importee)
      const vueDevtoolsPath = getVueDevtoolsPath()
      if (importee === devtoolsOptionsImportee) {
        return resolvedDevtoolsOptions
      } else if (importee.startsWith(virtualToolsPath)) {
        const resolved = importee.replace(virtualToolsPath, `${vueDevtoolsPath}/`)
        return `${resolved}${devtoolsNextResourceSymbol}`
      }
    },
    async load(id: string) {
      //   console.log(id)
      if (id === resolvedDevtoolsOptions) {
        console.log('3', id)
        console.log(
          `export default ${JSON.stringify({ base: '/', componentInspector: pluginOptions.componentInspector })}`
        )
        return `export default ${JSON.stringify({ base: '/', componentInspector: pluginOptions.componentInspector })}`
      } else if (id.endsWith(devtoolsNextResourceSymbol)) {
        const filename = removeUrlQuery(id)
        console.log('4', id, filename)
        return await fs$8.promises.readFile(filename, 'utf-8')
      }
    },
    options() {
      console.log('vueTools is running')
    },
    transform(code: string, id: string) {
      //   if (options2?.ssr) return
      //   const { appendTo } = pluginOptions
      //   const [filename] = id.split('?', 2)
      //   if (
      //     appendTo &&
      //     ((typeof appendTo === 'string' && filename.endsWith(appendTo)) ||
      //       (appendTo instanceof RegExp && appendTo.test(filename)))
      //   ) {
      //     console.log(1111111111)
      //     code = `import '${virtualToolsPath}:overlay.js';
      // ${code}`
      //   }
      return code
    },
    // 启用中间服务器
    configureServer(server: any) {
      // 获得基础路径
      const base = server.config.base || '/'
      console.log(DIR_CLIENT)
      server.middlewares.use(
        `${base}__devtools1__`,
        sirv(DIR_CLIENT, {
          single: true,
          dev: true
        })
      )
      setViteServerContext(server)
      //   const rpcFunctions = getRpcFunctions({
      //     rpc: inspect.api.rpc,
      //     server,
      //     config
      //   })
      //   createViteServerRpc(rpcFunctions)
      //   输出url
      const _printUrls = server.printUrls
      const colorUrl = (url: string) =>
        cyan(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))

      server.printUrls = () => {
        const urls = server.resolvedUrls
        const keys = normalizeComboKeyPrint('option-shift-d')
        _printUrls()
        for (const url of urls.local) {
          const devtoolsUrl = url.endsWith('/') ? `${url}__devtools1__/` : `${url}/__devtools1__/`
          console.log(
            `  ${green('\u279C')}  ${bold('My DevTools')}: ${green(`Open ${colorUrl(`${devtoolsUrl}`)} as a separate window`)}`
          )
        }
        console.log(`  ${green('\u279C')}  ${bold('My DevTools')}: ${green(`Press ${yellow(keys)} in App to toggle the Vue DevTools`)}
    `)
      }
    },
    transformIndexHtml(html: string) {
      if (pluginOptions.appendTo) return

      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head-prepend',
            attrs: {
              type: 'module',
              src: `/@id/${virtualToolsPath}overlay.js`
            }
          },
          // inject inspector script manually to ensure it's loaded after vue-devtools
          pluginOptions.componentInspector && {
            tag: 'script',
            injectTo: 'head-prepend',
            launchEditor: pluginOptions.launchEditor,
            attrs: {
              type: 'module',
              src: `/@id/virtual:vue-inspector-path:load.js`
            }
          }
        ].filter(Boolean)
      }
    }
  }
}

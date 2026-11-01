import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { createWebHandler } from './job-search/server/web-handler.ts'

const RPC_PATH = '/rpc'
const MAX_BODY_BYTES = 150000

const jobSearchRpc = (): Plugin => ({
  name: 'job-search-rpc',
  configureServer(server) {
    const api = createWebHandler()
    server.httpServer?.on('close', () => {
      void api.dispose()
    })
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith(RPC_PATH)) {
        return next()
      }
      try {
        const chunks: Array<Buffer> = []
        let size = 0
        for await (const chunk of req) {
          const buffer = Buffer.from(chunk)
          size += buffer.length
          if (size > MAX_BODY_BYTES) {
            res.writeHead(413)
            res.end()
            return
          }
          chunks.push(buffer)
        }
        const body = Buffer.concat(chunks)
        const headers = new Headers()
        Object.entries(req.headers).forEach(([name, value]) => {
          if (value) {
            headers.set(name, Array.isArray(value) ? value.join(', ') : value)
          }
        })
        headers.set('content-length', String(body.length))
        const method = req.method ?? 'GET'
        const hasBody = method !== 'GET' && method !== 'HEAD'
        const response = await api.handler(
          new Request(`http://${req.headers.host}${req.url}`, {
            method,
            headers,
            ...(hasBody ? { body } : {}),
          }),
        )
        res.writeHead(response.status, Object.fromEntries(response.headers))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch {
        res.writeHead(500)
        res.end('RPC request failed')
      }
    })
  },
})

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 8765,
    strictPort: true,
    fs: { deny: ['**/workspaces/**', '.env', '.env.*', '**/.git/**'] },
  },
  build: { outDir: 'dist/app' },
  optimizeDeps: { entries: ['job-search/app/entry.ts'] },
  plugins: [tailwindcss(), foldkit({ devToolsMcpPort: false }), jobSearchRpc()],
})

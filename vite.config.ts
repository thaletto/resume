import { defineConfig } from "vite";
import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { handleAPI } from "./job-search/src/server.ts";
import { Effect } from "effect";

export default defineConfig({
  server: { host: "127.0.0.1", port: 8765, strictPort: true, fs: { deny: ["**/workspaces/**", ".env", ".env.*", "**/.git/**"] } },
  build: { outDir: "dist/app" },
  optimizeDeps: { entries: ["job-search/app/entry.ts"] },
  plugins: [tailwindcss(), foldkit({ devToolsMcpPort: false }), {
    name: "job-search-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk));
            if (chunks.reduce((size, chunk) => size + chunk.length, 0) > 150000) { res.writeHead(413); res.end(); return; }
          }
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
          const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method ?? "GET", headers, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
          const response = await Effect.runPromise(handleAPI(request));
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch { res.writeHead(500); res.end("API request failed"); }
      });
    },
  }],
});

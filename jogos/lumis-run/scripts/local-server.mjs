// Servidor local do ranking online, para testes e desenvolvimento (sem Supabase).
// Uso: node scripts/local-server.mjs [porta]   → http://localhost:8787
// Mesma lógica da Edge Function (server/handler.ts), com banco em memória.
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const port = Number(process.argv[2] || 8787)
const out = await build({
  stdin: { contents: `export { handle } from './server/handler.ts'; export { MemoryDb } from './server/memoryDb.ts'`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})
const file = join(mkdtempSync(join(tmpdir(), 'lumis-')), 'server.mjs')
writeFileSync(file, out.outputFiles[0].text)
const { handle, MemoryDb } = await import(pathToFileURL(file).href)

const db = new MemoryDb()
const base = `http://localhost:${port}`
const deps = {
  db,
  now: () => Date.now(),
  randomSeed: () => (Math.random() * 2 ** 32) >>> 0,
  staffPassword: process.env.LUMIS_EQUIPE_SENHA || 'senha-local',
  photoUrl: (id, v) => `${base}/fotos/${id}.jpg?v=${v}`,
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }

createServer(async (req, res) => {
  const url = new URL(req.url, base)
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end()
  const foto = /^\/fotos\/(\w+)\.jpg$/.exec(url.pathname)
  if (foto) {
    const img = db.photos.get(foto[1])
    return img ? res.writeHead(200, { ...cors, 'content-type': 'image/jpeg' }).end(Buffer.from(img)) : res.writeHead(404, cors).end()
  }
  // simula queda de internet nos testes
  if (url.pathname === '/__offline') {
    deps.offline = url.searchParams.get('v') === '1'
    return res.writeHead(200, cors).end('ok')
  }
  if (deps.offline) return req.socket.destroy()
  let text = ''
  for await (const c of req) text += c
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    return res.writeHead(400, cors).end('{"error":"json"}')
  }
  const r = await handle({ method: req.method, path: url.pathname, body }, deps)
  res.writeHead(r.status, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify(r.body))
}).listen(port, () => console.log(`ranking local em ${base}`))

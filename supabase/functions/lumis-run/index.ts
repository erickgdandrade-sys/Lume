// Edge Function do ranking online do Lumis Run 3D.
// A lógica fica em handler.js, gerado a partir de jogos/lumis-run/server/handler.ts
// (npm run build:server dentro de jogos/lumis-run). Não edite handler.js à mão.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handle } from './handler.js'
import { SupabaseDb } from './db.ts'

const url = Deno.env.get('SUPABASE_URL')!
const supabase = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const db = new SupabaseDb(supabase)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const path = new URL(req.url).pathname.replace(/^.*\/lumis-run/, '') || '/'
  let body: unknown = null
  if (req.method === 'POST') {
    const text = await req.text()
    if (text.length > 400_000) return Response.json({ error: 'grande' }, { status: 413, headers: cors })
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      return Response.json({ error: 'json' }, { status: 400, headers: cors })
    }
  }
  const res = await handle(
    { method: req.method, path, body },
    {
      db,
      now: () => Date.now(),
      randomSeed: () => crypto.getRandomValues(new Uint32Array(1))[0],
      staffPassword: Deno.env.get('LUMIS_EQUIPE_SENHA') ?? '',
      photoUrl: (id: string, v: number) => `${url}/storage/v1/object/public/lumis-fotos/${id}.jpg?v=${v}`,
    },
  )
  const cache = path === '/ranking' ? { 'Cache-Control': 'public, max-age=5' } : { 'Cache-Control': 'no-store' }
  return Response.json(res.body, { status: res.status, headers: { ...cors, ...cache } })
})

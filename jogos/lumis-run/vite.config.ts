/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import online from './online.json'
import pkg from './package.json'

// base relativa para a prévia funcionar em qualquer caminho (ex.: /lumis-run/).
// O modo "preview-artifact" gera um único HTML autocontido, usado para publicar a prévia.
export default defineConfig(({ mode }) => {
  const single = mode === 'preview-artifact'
  // modo "site": build publicado com o site da Lume no GitHub Pages; o QR aponta para lá
  const site = mode === 'site'
  // ranking online: Edge Function do projeto Supabase em online.json (VITE_LUMIS_API sobrepõe, ex.: servidor local nos testes)
  const api = process.env.VITE_LUMIS_API ?? (site && online.projectRef ? `https://${online.projectRef}.supabase.co/functions/v1/lumis-run` : '')
  return {
    base: './',
    define: {
      'import.meta.env.VITE_LUMIS_API': JSON.stringify(api),
      __LUMIS_VERSION__: JSON.stringify(pkg.version),
      ...(site ? { 'import.meta.env.VITE_SHARE_BASE': JSON.stringify('https://erickgdandrade-sys.github.io/Lume/lumis-run/') } : {}),
    },
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1000,
      outDir: single ? 'dist-artifact' : 'dist',
      ...(single ? { assetsInlineLimit: 100_000_000 } : {}),
    },
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  }
})

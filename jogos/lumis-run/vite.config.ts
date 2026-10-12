/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base relativa para a prévia funcionar em qualquer caminho (ex.: /lumis-run/).
// O modo "preview-artifact" gera um único HTML autocontido, usado para publicar a prévia.
export default defineConfig(({ mode }) => {
  const single = mode === 'preview-artifact'
  // modo "site": build publicado com o site da Lume no GitHub Pages; o QR aponta para lá
  const site = mode === 'site'
  return {
    base: './',
    ...(site ? { define: { 'import.meta.env.VITE_SHARE_BASE': JSON.stringify('https://erickgdandrade-sys.github.io/Lume/lumis-run/') } } : {}),
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

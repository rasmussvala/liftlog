import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}
const commit = process.env.GITHUB_SHA?.slice(0, 7) ??
  `${execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim()}-local`

// A PR preview (LIFTLOG_PREVIEW=1, set by .github/workflows/preview.yml). It's served from the same
// origin as the real app, so it keeps its data apart and doesn't install as an offline app.
const preview = process.env.LIFTLOG_PREVIEW === '1'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://rasmussvala.github.io/liftlog/
  base: '/liftlog/',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_COMMIT__: JSON.stringify(commit),
    // Names the IndexedDB database and prefixes localStorage keys.
    __DATA_NAMESPACE__: JSON.stringify(preview ? 'liftlog-preview' : 'liftlog'),
  },
  plugins: [
    react(),
    tailwindcss(),
    // https://vite-pwa-org.netlify.app/guide/
    VitePWA({
      registerType: 'autoUpdate',
      disable: preview,
      // PR previews live under /liftlog/pr-preview/: the real app's service worker must not answer for them.
      workbox: { navigateFallbackDenylist: [/\/pr-preview\//] },
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'LiftLog',
        short_name: 'LiftLog',
        description: 'Personal 1RM tracker',
        theme_color: '#15161c',
        background_color: '#15161c',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})

import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// Regenerate icons with: npm run generate-pwa-assets
// Pad maskable and Apple icons with the logo's background color
// instead of white.
const background = '#15161c'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background } },
    apple: { ...preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})

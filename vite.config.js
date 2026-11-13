import { defineConfig } from 'vite';

// The bundled CJK webfonts ship as woff2 + woff. Every browser that can run this game
// (WebGL2) reads woff2, so drop the woff fallbacks and halve the size of dist/.
const woff2Only = {
  name: 'woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('@fontsource') || !id.endsWith('.css')) return null;
    return code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '');
  },
};

export default defineConfig({
  plugins: [woff2Only],
  build: { chunkSizeWarningLimit: 1200 },
});

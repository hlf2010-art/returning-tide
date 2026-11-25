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
  build: {
    chunkSizeWarningLimit: 1200, target: ['es2020', 'safari14'],   // older Safari (macOS Big Sur) too
    // three.js in a file of its own: it changes far less often than the game, so a returning player's
    // browser keeps it cached across updates, and the two download side by side
    rollupOptions: { output: { manualChunks: (id) => (/node_modules[\\/]three[\\/](build|src)[\\/]/.test(id) ? 'three' : undefined) } },
  },
});

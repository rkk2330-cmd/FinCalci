import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    // Keep console.error for production crash visibility
    // Only strip console.log/info/debug/warn + debugger
    pure: ['console.log', 'console.info', 'console.debug', 'console.warn'],
    drop: ['debugger'],
  },
  build: {
    outDir: 'dist',
    // 'hidden' = .map files generated (for Sentry/error tracking)
    // but NOT referenced in JS bundles (users never download them)
    sourcemap: 'hidden',
    // Target modern browsers (90%+ of Indian Android users)
    target: 'es2018',
    // Optimal chunk splitting
    rollupOptions: {
      output: {
        // Manual chunks for best caching
        manualChunks: {
          // React framework — cached separately, rarely changes
          'vendor-react': ['react', 'react-dom'],
        },
        // Name chunks predictably for SW caching
        chunkFileNames: 'assets/calc-[name]-[hash:8].js',
        entryFileNames: 'assets/app-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8][extname]',
      },
    },
    // Inline small assets (< 4KB) as base64
    assetsInlineLimit: 4096,
    // Minification — use esbuild (Vite default, no extra dependency)
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true,
    // Chunk size warning at 50KB (default 500KB is too lenient)
    chunkSizeWarningLimit: 50,
  },
  // Dev server
  server: {
    port: 5173,
    host: true,
  },
})

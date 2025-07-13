import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      // Node.js module shims
      'fs': resolve(__dirname, 'src/shims/fs.ts'),
      'fs/promises': resolve(__dirname, 'src/shims/fs-promises.ts'),
      'path': resolve(__dirname, 'src/shims/path.ts'),
      'child_process': resolve(__dirname, 'src/shims/child_process.ts'),
      'os': resolve(__dirname, 'src/shims/os.ts'),
      'util': resolve(__dirname, 'src/shims/util.ts'),
      'stream': resolve(__dirname, 'src/shims/stream.ts'),
      'buffer': resolve(__dirname, 'src/shims/buffer.ts'),
      'process': resolve(__dirname, 'src/shims/process.ts'),
      'node:fs': resolve(__dirname, 'src/shims/fs.ts'),
      'node:fs/promises': resolve(__dirname, 'src/shims/fs-promises.ts'),
      'node:path': resolve(__dirname, 'src/shims/path.ts'),
      'node:child_process': resolve(__dirname, 'src/shims/child_process.ts'),
      'node:os': resolve(__dirname, 'src/shims/os.ts'),
      'node:util': resolve(__dirname, 'src/shims/util.ts'),
      'node:stream': resolve(__dirname, 'src/shims/stream.ts'),
      'node:buffer': resolve(__dirname, 'src/shims/buffer.ts'),
      'node:process': resolve(__dirname, 'src/shims/process.ts'),
      'node:v8': resolve(__dirname, 'src/shims/v8.ts'),
      'node:url': resolve(__dirname, 'src/shims/url.ts'),
      'node:events': resolve(__dirname, 'src/shims/events.ts'),
      'node:string_decoder': resolve(__dirname, 'src/shims/string_decoder.ts'),
    },
  },
  
  define: {
    'process.env': '{}',
    'process.platform': '"browser"',
    'process.version': '"v18.0.0"',
    'process.versions': JSON.stringify({ node: "18.0.0" }),
    'global': 'globalThis',
  },
  
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'GeminiCliBrowser',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['glob', 'path-scurry', 'minipass'],
      output: {
        dir: 'dist',
        format: 'es',
      },
    },
  },
  
  server: {
    port: 3000,
    headers: {
      // Required for SharedArrayBuffer (if needed for advanced features)
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  
  optimizeDeps: {
    exclude: ['@google/gemini-cli-core'],
  },
});
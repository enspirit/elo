import { defineConfig } from 'astro/config';
import { resolve } from 'path';

export default defineConfig({
  site: 'https://elo-lang.org',
  base: '/',
  output: 'static',
  server: { port: 4322 },
  markdown: {
    // Disable Shiki syntax highlighting - we use our own custom highlighter
    // that supports Elo language and matches our theme system
    syntaxHighlight: false
  },
  vite: {
    resolve: {
      alias: {
        '@enspirit/elo': resolve('../src/index.ts')
      }
    },
    optimizeDeps: {
      include: [
        'luxon'
      ]
    }
  }
});

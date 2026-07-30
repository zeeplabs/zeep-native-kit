import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', tokens: 'src/tokens/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'dompurify', 'highlight.js', 'marked'],
});

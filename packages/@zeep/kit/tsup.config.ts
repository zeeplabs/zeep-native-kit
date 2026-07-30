import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@tauri-apps/api',
    '@zeep/core',
    '@zeep/ui',
    '@zeep/logger',
    '@zeep/updater',
    '@zeep/ai',
  ],
});

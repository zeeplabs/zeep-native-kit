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
    '@zeeptech/core',
    '@zeeptech/ui',
    '@zeeptech/logger',
    '@zeeptech/updater',
    '@zeeptech/ai',
  ],
});

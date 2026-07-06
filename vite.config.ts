import { defineConfig } from 'vitest/config';
import pkg from './package.json';

// Build-Version: CI setzt BUILD_VERSION auf den Commit-SHA → jeder Deploy ist eine
// neue Version fürs Update-Banner (implementation.md §16). Muss exakt zu dist/version.json
// passen (siehe .github/workflows/deploy.yml).
const sha = (process.env.BUILD_VERSION ?? 'dev').slice(0, 8);

export default defineConfig({
  base: process.env.DEPLOY_BASE ?? '/endless-arena/',
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${sha}`),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});

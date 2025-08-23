import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    reporters: ['default'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text','lcov','json-summary'],
      reportsDirectory: 'coverage',
      exclude: [
        'scripts/**',
        '**/*.test.ts',
        'dist/**',
        'dist-baseline/**',
        'golden/**',
        '.eslintrc.cjs',
        '**/vite.config.*',
  'tsconfig*.json',
  'src/engine/rng-shim.ts',
  'src/engine/rngShim.ts'
      ]
    }
  }
});

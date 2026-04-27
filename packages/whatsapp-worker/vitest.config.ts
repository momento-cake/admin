import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // index.ts and firestore.ts wire Baileys + firebase-admin live; covered
      // by manual / E2E tests in Phase 5, not unit tests. types.ts is pure
      // type declarations.
      exclude: [
        'src/__tests__/**',
        'src/index.ts',
        'src/firestore.ts',
        'src/types.ts',
        '**/*.d.ts',
        'dist/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});

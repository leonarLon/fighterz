import { defineConfig } from 'vitest/config';

// Cobertura das regras de negócio do core (custo zero: @vitest/coverage-v8, local, MIT).
// Regras do banco são cobertas por pgTAP e não entram neste percentual.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/db/types.ts', 'src/index.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});

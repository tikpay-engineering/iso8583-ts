import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['dist/**', 'tests/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          exclude: ['tests/int/**'],
          typecheck: {
            enabled: true,
            include: ['tests/unit/**/*.test.ts'],
            ignoreSourceErrors: false,
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/int/**/*.int.test.ts'],
          exclude: ['tests/unit/**'],
          typecheck: {
            enabled: true,
            include: ['tests/int/**/*.int.test.ts'],
            ignoreSourceErrors: false,
          },
        },
      },
    ],
  },
})

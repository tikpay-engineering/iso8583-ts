import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['dist/**', 'tests/**'],
    },
  },
})

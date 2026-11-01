import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['job-search/**/*.test.ts'] },
})

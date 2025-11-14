import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./minimal-setupTests.ts'],
    globals: true,
  },
});

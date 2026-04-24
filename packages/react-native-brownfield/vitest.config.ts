import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    clearMocks: true,
  },
});

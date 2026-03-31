/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx,js,jsx}'],
    coverage: {
      include: ['src/utils/**', 'src/calculators/**'],
      reporter: ['text', 'html'],
    },
  },
});

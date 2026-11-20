import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load local frontend/env when present
const explicitEnvPath = path.resolve(__dirname, 'env');
if (fs.existsSync(explicitEnvPath)) {
  dotenv.config({ path: explicitEnvPath });
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});

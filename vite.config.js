import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const moduleToBuild = process.env.BUILD_MODULE;

let buildConfig = {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      warehouse: resolve(__dirname, 'warehouse.html'),
    }
  }
};

if (moduleToBuild) {
  buildConfig = {
    outDir: `dist/${moduleToBuild}`,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        [moduleToBuild]: resolve(__dirname, `${moduleToBuild}.html`),
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    allowedHosts: true,
  },
  build: buildConfig
})


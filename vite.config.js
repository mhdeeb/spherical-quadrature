import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        appEfficiency: fileURLToPath(new URL('./efficiency.html', import.meta.url)),
      },
    },
  },
  base: "/grad/",
})
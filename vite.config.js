import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import shader from 'rollup-plugin-shader'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    shader({
      include: '**/*.glsl'
    }),
  ],
})

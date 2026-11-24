import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// 静态站点构建：只把 showcase/ 打包成 HTML/CSS/JS，产物不进 npm 包。
// GitHub Pages 的项目站挂在子路径下，由 SITE_BASE 注入（默认根路径）。
export default defineConfig({
  plugins: [react()],
  root: resolve(import.meta.dirname, 'showcase'),
  base: process.env.SITE_BASE ?? '/',
  build: {
    outDir: resolve(import.meta.dirname, 'dist-site'),
    emptyOutDir: true,
  },
})

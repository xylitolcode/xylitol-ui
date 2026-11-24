import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, 'showcase')
const outDir = resolve(import.meta.dirname, 'dist')

export default defineConfig({
  plugins: [react()],
  // 开发服务器只服务 showcase/，库源码通过 ../src 被站点引用
  root,
  build: {
    // 构建产物落回仓库根目录的 dist/，不受 root 影响
    outDir,
    emptyOutDir: true,
    // showcase/public 里的 favicon 等资源不进发布包
    copyPublicDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
    },
  },
})

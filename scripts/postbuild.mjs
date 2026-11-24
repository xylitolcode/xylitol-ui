// 构建后处理：打磨类型产物，让它在各种 TypeScript 解析模式下都能用。
//
// 1) 从 dist/index.d.ts 移除 `import './index.css'`。Vite 库模式需要这一行把 CSS
//    拉进构建图（否则产不出 dist/index.css），但同一个入口同时用于声明生成，
//    这行会被带进类型文件；消费者若没开 allowArbitraryExtensions / skipLibCheck
//    就会报 TS2307。样式通过 `@xylitol0520/ui/style.css` 显式引入，删掉即可。
//
// 2) 给所有 .d.ts 里的相对导入补上显式扩展名（`./context` → `./context.js`）。
//    源码用 bundler 解析、不带扩展名没问题，但 Node16/NodeNext 模式下 ESM 规范符
//    必须带扩展名，否则消费者的类型解析会内部失败。
import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '../dist')
const entryFile = join(distDir, 'index.d.ts')

const cssImportPattern = /^import ['"]\.\/index\.css['"];\n?/m
const relativeSpecifierPattern = /(\bfrom\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"]*)\2/g

async function collectDeclarations(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return collectDeclarations(path)
      return entry.name.endsWith('.d.ts') ? [path] : []
    }),
  )
  return files.flat()
}

/** 把 `./x` 解析成带扩展名的规范符：优先 `./x.js`，其次 `./x/index.js`。 */
function withExtension(file, specifier) {
  const target = resolve(dirname(file), specifier)
  if (existsSync(`${target}.d.ts`)) return `${specifier}.js`
  if (existsSync(join(target, 'index.d.ts'))) return `${specifier}/index.js`
  throw new Error(`${file} 中的相对导入 "${specifier}" 找不到对应的声明文件`)
}

const declarations = await collectDeclarations(distDir)

for (const file of declarations) {
  const source = await readFile(file, 'utf8')
  let output = source

  if (file === entryFile) {
    if (!cssImportPattern.test(output)) {
      throw new Error('dist/index.d.ts 中未找到预期的 CSS 引入，构建流程可能已变更')
    }
    output = output.replace(cssImportPattern, '')
  }

  output = output.replace(relativeSpecifierPattern, (match, prefix, quote, specifier) => {
    if (/\.(js|json|css)$/.test(specifier)) return match
    return `${prefix}${quote}${withExtension(file, specifier)}${quote}`
  })

  if (output !== source) await writeFile(file, output)
}

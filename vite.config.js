import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import assemblyscriptPlugin from './config/vite-plugin-assemblyscript.js'

export default defineConfig(() => {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    plugins: [
      assemblyscriptPlugin({
        include: /\.ts$/,
      }),
    ],
    build: {
      lib: {
        entry: {
          butterchurn: resolve(process.cwd(), 'src/index.js'),
          isSupported: resolve(process.cwd(), 'src/isSupported.js'),
        },
        formats: ['es'],
        fileName: (format, entryName) => {
          const suffix = isProduction ? '.min.js' : '.js'
          return `${entryName}${suffix}`
        },
      },
      rollupOptions: {
        external: [],
        output: {
          dir: 'dist',
          format: 'es',
        },
      },
      sourcemap: true,
      target: 'es2020',
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: false,
            },
          }
        : undefined,
    },
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src'),
      },
    },
  }
})

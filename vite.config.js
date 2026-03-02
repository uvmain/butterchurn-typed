import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import assemblyscriptPlugin from './config/vite-plugin-assemblyscript.js'

export default defineConfig(() => {
  return {
    plugins: [
      assemblyscriptPlugin({
        include: 'src/assemblyscript/presetFunctions.ts',
      }),
      dts({
        insertTypesEntry: true,
      }),
    ],
    build: {
      lib: {
        entry: {
          butterchurn: resolve(process.cwd(), 'src/index.js'),
          isSupported: resolve(process.cwd(), 'src/isSupported.ts'),
        },
        formats: ['es'],
      },
      sourcemap: true,
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src'),
      },
    },
  }
})

import { defineConfig } from 'tsdown'

export default defineConfig({
  noExternal: ['express', 'cors'],
  // minify: true, # bugged
  clean: false,
  format: ['cjs'],
})

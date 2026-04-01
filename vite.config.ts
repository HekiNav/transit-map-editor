import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vitePluginSQLocal from 'sqlocal/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    vitePluginSQLocal()
  ],
  
})
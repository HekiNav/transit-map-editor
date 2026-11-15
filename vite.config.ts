import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vitePluginSQLocal from 'sqlocal/vite'
    import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    tailwindcss(),
    vitePluginSQLocal(),
    cloudflare()
  ],
  
})
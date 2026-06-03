import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { loadVersion } from '@sws2apps/vite-plugin-package-version';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      vue(),

      ui(),

      loadVersion(),
    ],
  }
})

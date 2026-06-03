/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { loadVersion } from '@sws2apps/vite-plugin-package-version';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      vue(),

      // colorMode: false 關閉 Nuxt UI 的 useDark() 插件，強制鎖定亮色模式
      ui({ colorMode: false }),

      loadVersion(),
    ],
    test: {
      environment: 'happy-dom',
    },
  }
})

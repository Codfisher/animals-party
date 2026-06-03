/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import VueRouter from 'unplugin-vue-router/vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { loadVersion } from '@sws2apps/vite-plugin-package-version';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      // 檔案路由（須置於 vue() 之前），來源資料夾為 src/pages
      VueRouter({
        routesFolder: 'src/pages',
      }),

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

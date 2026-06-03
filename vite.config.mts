/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import VueRouter from 'unplugin-vue-router/vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';

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
      ui({
        colorMode: false,
        // 全域主題：toast 套用派對風毛玻璃樣式，呼應 base-btn 的圓潤、柔和暖色調
        ui: {
          toast: {
            slots: {
              root: 'rounded-[1.75rem] bg-[#fff6e9]/90 backdrop-blur-md ring-1 ring-[#856639]/15 shadow-[0_12px_30px_-8px_rgba(133,102,57,0.3),0_6px_12px_-6px_rgba(0,0,0,0.1)] p-4 gap-3',
              icon: 'size-6',
              title: 'font-black tracking-wide text-[#4a3b22]',
              description: 'text-[#7a6240]',
              progress: 'rounded-full',
            },
          },
        },
      }),
    ],
    test: {
      environment: 'happy-dom',
    },
  }
})

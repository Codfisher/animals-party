import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { loadVersion } from '@sws2apps/vite-plugin-package-version';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [
      vue({
        template: { transformAssetUrls }
      }),

      quasar({
        sassVariables: 'src/style/quasar-variables.sass'
      }),

      basicSsl(),
      loadVersion(),
    ],
    server: {
      https: true,
      proxy: {
        '/socket.io': {
          target: 'ws://localhost/socket.io',
          ws: true
        }
      }
    }
  }
})
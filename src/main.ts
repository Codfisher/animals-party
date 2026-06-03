import { createApp } from 'vue';
import router from './router/router';
import { createPinia } from 'pinia';
import { createHead } from '@unhead/vue/client';
import ui from '@nuxt/ui/vue-plugin';

import App from './App.vue';

// Tailwind CSS + Nuxt UI
import './index.css';

// 自訂樣式
import './style/animate.sass';
import './style/global.sass';


createApp(App)
  .use(createHead())
  .use(ui)
  .use(createPinia())
  .use(router)
  .mount('#app')


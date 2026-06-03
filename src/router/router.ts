import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...routes,
    /** 根路徑導向首頁 */
    { path: '/', redirect: '/home' },
    /** 其餘未匹配路徑導回根路徑 */
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router

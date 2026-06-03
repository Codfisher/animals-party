import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLoadingStore = defineStore('loading', () => {
  return {
    isLoading: ref(false),
    /** 表示 loading screen 正在進入畫面 */
    isEntering: ref(false),
    /** 表示 loading screen 正在離開畫面 */
    isLeaving: ref(false),
    /** loading 樣式，預留未來可以切換多種樣式 */
    type: ref(''),
  }
})
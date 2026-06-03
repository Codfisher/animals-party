import { promiseTimeout, until, watchOnce } from '@vueuse/core';
import { defaults } from 'lodash-es';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue'
import { useLoadingStore } from '../stores/loading.store'

export interface State {
  isEntering: boolean,
  isLeaving: boolean,
}

interface UseLoadingParams {
  /** 最小持續時間 (ms，預設 1000)
   * 
   * 讀取頁面進入完成至開始離開之間的最小時間，可用來展示動畫。
   */
  minDuration?: number;
}
const defaultParams: Required<UseLoadingParams> = {
  minDuration: 1000,
}

export function useLoading(paramsIn?: UseLoadingParams) {
  const params = defaults(paramsIn, defaultParams);

  const store = useLoadingStore();
  const { isLoading, isEntering, isLeaving } = storeToRefs(store);

  /** 讀取畫面顯示狀態 */
  const visible = ref(false);

  watch(isLoading, (value) => {
    visible.value = value;
  }, {
    immediate: true
  });

  watch(visible, async (value) => {
    // show() 要立即顯示
    if (value) {
      store.$patch({
        isLoading: true,
      });
      return;
    }

    await promiseTimeout(params.minDuration);

    // hide() entering 為 false，直接隱藏
    if (!isEntering.value) {
      store.$patch({
        isLoading: false,
      });
      return;
    }

    // entering 結束之後才可隱藏
    watchOnce(isEntering, () => {
      store.$patch({
        isLoading: false,
      });
    })
  }, {
    deep: true
  });

  /** 
   * 等到過場動畫進入完成後，才會完成 Promise
   * 可以避免動畫還沒完成就跳頁的問題
   */
  async function show() {
    visible.value = true;

    await until(isEntering).toBe(true);
    await until(isEntering).toBe(false);
  }


  /** 等到過場動畫離開完成後，才會完成 Promise */
  async function hide() {
    visible.value = false;

    await until(isLeaving).toBe(true);
    await until(isLeaving).toBe(false);
  }

  /** 處理狀態更新 */
  function handleUpdate({ isEntering, isLeaving }: State) {
    store.$patch({
      isEntering,
      isLeaving
    });
  }

  return {
    isLoading,
    isEntering,
    isLeaving,

    show,
    hide,
    handleUpdate
  }
}
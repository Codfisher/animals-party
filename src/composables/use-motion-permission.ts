import { ref } from 'vue';
import { PlayerPermissionState } from '../types';

interface RequestableDeviceMotionEvent {
  requestPermission?: () => Promise<PermissionState>;
}

const motionEvent =
  typeof window !== 'undefined' && 'DeviceMotionEvent' in window
    ? (window.DeviceMotionEvent as unknown as RequestableDeviceMotionEvent)
    : undefined;

/** iOS 13+ 需以使用者手勢呼叫 requestPermission 才能取得體感權限 */
const needsRequest = typeof motionEvent?.requestPermission === 'function';

/** 體感（DeviceMotion）權限
 *
 * 取代 Permissions API（其不支援 iOS 的體感權限機制）。
 * - 不支援 DeviceMotion：not-support
 * - iOS 13+：初始 prompt，需呼叫 request()（限使用者手勢）跳系統提示
 * - 其他瀏覽器：DeviceMotion 不需顯式授權，視為 granted
 */
export function useMotionPermission() {
  const state = ref<PlayerPermissionState>(
    !motionEvent ? 'not-support' : needsRequest ? 'prompt' : 'granted',
  );

  /** 請求體感權限，必須由使用者手勢（點擊）觸發 */
  async function request(): Promise<PlayerPermissionState> {
    if (!motionEvent) {
      state.value = 'not-support';
      return state.value;
    }

    if (!needsRequest) {
      state.value = 'granted';
      return state.value;
    }

    try {
      const result = await motionEvent.requestPermission?.();
      state.value = result === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('[ useMotionPermission ] 請求體感權限失敗 : ', error);
      state.value = 'denied';
    }

    return state.value;
  }

  return {
    state,
    request,
    /** 是否需要顯式請求（iOS） */
    needsRequest,
  };
}

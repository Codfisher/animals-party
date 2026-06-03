import mitt from 'mitt';

type EffectEventMap = {
  /** 兩側向中央噴發的慶祝彩帶 */
  confetti: void;
};

/** 模組層級單例，讓任何元件都能觸發同一個覆蓋層特效 */
const bus = mitt<EffectEventMap>();

/** 全域特效觸發器
 *
 * 特效本身由覆蓋於最上層的 effects-overlay 元件繪製，
 * 此 composable 僅負責跨元件觸發。
 */
export function useEffects() {
  return {
    /** 觸發兩側向中央噴發的慶祝彩帶 */
    fireConfetti() {
      bus.emit('confetti');
    },
    /** 監聽彩帶觸發（供 overlay 元件使用） */
    onConfetti(handler: () => void) {
      bus.on('confetti', handler);
    },
    offConfetti(handler: () => void) {
      bus.off('confetti', handler);
    },
  };
}

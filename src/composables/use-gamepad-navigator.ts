import { Ref, computed, onMounted, ref } from 'vue';

export interface ControllableElement {
  click(): void;
  hover(): void;
  leave(): void;
  isHover(): boolean;
}

export function useGamepadNavigator<T extends ControllableElement>(elements: Ref<T[]> = ref([])) {
  /** 綁定控制元件 */
  function mountElement(el: T | null) {
    if (!el) return;

    elements.value.push(el);
  }

  /** hover 指定元件 */
  function hoverElement(index: number) {
    elements.value.forEach((el) => el.leave());
    elements.value?.[index]?.hover();
  }

  /** 目前 hover 元件的 index */
  const currentIndex = computed(() =>
    elements.value.findIndex(({ isHover }) => isHover())
  );

  /** 上一個元件 */
  function prev() {
    if (currentIndex.value < 0) {
      return hoverElement(0);
    }

    let targetIndex = currentIndex.value - 1;
    if (targetIndex < 0) {
      targetIndex += elements.value.length;
    }

    return hoverElement(targetIndex);
  }

  /** 下一個元件 */
  function next() {
    if (currentIndex.value < 0) {
      return hoverElement(0);
    }

    const targetIndex = (currentIndex.value + 1) % elements.value.length;
    return hoverElement(targetIndex);
  }

  /** 點擊目前 hover 元件 */
  function click() {
    if (currentIndex.value < 0) {
      hoverElement(0);
      return elements.value?.[0]?.click();
    }

    const targetIndex = currentIndex.value;
    hoverElement(targetIndex);
    return elements.value[targetIndex].click();
  }

  /** 自動 hover 第一個元件 */
  onMounted(() => {
    elements.value?.[0]?.hover();
  });

  return {
    mountElement,
    next,
    prev,
    click,
  }
}
